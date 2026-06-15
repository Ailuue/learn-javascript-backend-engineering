/**
 * WebSocket Rooms
 * ================
 * Clients join a named room via the URL path; messages broadcast only to others
 * in the same room (Slack channels, game lobbies, segmented broadcast).
 *
 *   ws://localhost:8000/ws/general?username=alice
 *   ws://localhost:8000/ws/dev?username=carol   ← isolated from #general
 *
 * `ws` doesn't do path params, so we parse req.url ourselves. Still one process —
 * production uses Redis pub/sub per "room:{name}" channel to span workers.
 *
 * Run:  node 03_rooms.js  →  open http://localhost:8000, connect tabs to
 *   ws://localhost:8000/ws/general?username=alice and .../ws/dev?username=carol
 */

const http = require("http");
const path = require("path");
const express = require("express");
const { WebSocketServer, WebSocket } = require("ws");

const app = express();
app.use(express.static(path.join(__dirname, "static")));
app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "static", "chat.html")));

class RoomManager {
  constructor() {
    this.rooms = new Map(); // room → Set<ws>
  }

  join(room, ws) {
    if (!this.rooms.has(room)) this.rooms.set(room, new Set());
    this.rooms.get(room).add(ws);
    console.log(`  + [${room}] client joined   (room size: ${this.rooms.get(room).size})`);
  }

  leave(room, ws) {
    this.rooms.get(room)?.delete(ws);
    console.log(`  - [${room}] client left   (room size: ${this.rooms.get(room)?.size ?? 0})`);
  }

  broadcast(room, message) {
    for (const ws of this.rooms.get(room) ?? []) {
      if (ws.readyState === WebSocket.OPEN) ws.send(message);
      else this.leave(room, ws);
    }
  }
}

const manager = new RoomManager();
const server = http.createServer(app);
// noServer mode: route the upgrade ourselves so we can read the room + username.
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, "http://localhost");
  const match = url.pathname.match(/^\/ws\/([^/]+)$/);
  if (!match) {
    socket.destroy();
    return;
  }
  const room = decodeURIComponent(match[1]);
  const username = url.searchParams.get("username") || "anonymous";
  wss.handleUpgrade(req, socket, head, (ws) => {
    manager.join(room, ws);
    manager.broadcast(room, `*** ${username} joined #${room} ***`);
    ws.on("message", (data) => manager.broadcast(room, `[${username}] ${data.toString()}`));
    ws.on("close", () => {
      manager.leave(room, ws);
      manager.broadcast(room, `*** ${username} left #${room} ***`);
    });
  });
});

if (require.main === module) {
  server.listen(8000, () => console.log("rooms server on http://localhost:8000"));
}

module.exports = { server, RoomManager };
