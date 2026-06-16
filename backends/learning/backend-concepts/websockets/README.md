# WebSockets & SSE

Real-time communication with the [`ws`](https://github.com/websockets/ws) library
(WebSockets) and Express (static pages + Server-Sent Events).

| File | What it teaches |
|---|---|
| `01_echo.js` | Connection lifecycle: handshake, `message`, `close`; echo server |
| `02_broadcast.js` | A ConnectionManager broadcasting to all clients; stale-socket cleanup |
| `03_rooms.js` | Named rooms via the URL path (`noServer` upgrade routing) |
| `04_sse.js` | Server-Sent Events: push-only feeds over plain HTTP, named events |

`static/chat.html` and `static/sse.html` are browser test pages — they use the
native `WebSocket` / `EventSource` APIs.

## Run

```bash
npm install                 # from the repo root (ws, express)
node 01_echo.js             # open http://localhost:8000
node 04_sse.js
curl -N localhost:8000/stream/deploy-log
```

