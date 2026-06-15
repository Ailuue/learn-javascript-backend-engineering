/**
 * WebSocket Broadcast: Chat Room
 * ================================
 * A ConnectionManager tracks every client and broadcasts to all at once — the
 * basis of any multi-user real-time feature (chat, live dashboards, cursors).
 *
 * Detecting stale connections: a client can drop without a close frame. The `ws`
 * library exposes readyState; we skip/clean sockets that aren't OPEN.
 *
 * This Set lives in ONE process. Multiple workers/containers each have their own,
 * so production backs broadcast with Redis pub/sub so a message reaches clients
 * on any process.
 *
 * Run:  node 02_broadcast.js  →  open http://localhost:8000 in two tabs
 */

const http = require("http");
const path = require("path");
const express = require("express");
const { WebSocketServer, WebSocket } = require("ws");

const app = express();
app.use(express.static(path.join(__dirname, "static")));
app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "static", "chat.html")));

class ConnectionManager {
  constructor() {
    this.active = new Set();
  }

  add(ws) {
    this.active.add(ws);
    console.log(`  + client connected   (total: ${this.active.size})`);
  }

  remove(ws) {
    this.active.delete(ws);
    console.log(`  - client disconnected  (total: ${this.active.size})`);
  }

  broadcast(message) {
    for (const ws of this.active) {
      if (ws.readyState === WebSocket.OPEN) ws.send(message);
      else this.remove(ws); // stale socket found mid-broadcast
    }
  }
}

const manager = new ConnectionManager();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws) => {
  manager.add(ws);
  ws.on("message", (data) => {
    const text = data.toString();
    console.log(`  message: ${JSON.stringify(text)}`);
    manager.broadcast(text);
  });
  ws.on("close", () => manager.remove(ws));
});

if (require.main === module) {
  server.listen(8000, () => console.log("broadcast server on http://localhost:8000"));
}

module.exports = { server, ConnectionManager };
