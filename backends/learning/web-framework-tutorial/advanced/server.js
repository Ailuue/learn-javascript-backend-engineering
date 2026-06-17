/*
 * Advanced web framework guide — Express + ws
 * ===========================================
 * A playground of advanced HTTP patterns: settings, timing middleware, streaming,
 * SSE, custom responses, basic auth, sub-apps, WebSockets, and pagination.
 *
 * Run:  node advanced/server.js   →  http://localhost:8001
 */

const http = require("http");
const crypto = require("crypto");
const express = require("express");
const cookieParser = require("cookie-parser");
const { WebSocketServer } = require("ws");

// ── Settings (from env vars) ────────────────────────────────────────────────
const settings = {
  appName: process.env.ADV_APP_NAME || "Advanced Demo",
  adminEmail: process.env.ADV_ADMIN_EMAIL || "admin@example.com",
  itemsPerPage: Number(process.env.ADV_ITEMS_PER_PAGE || 10),
  debug: process.env.ADV_DEBUG === "true",
};

const app = express();
app.use(express.json());
app.use(express.text({ type: ["application/xml", "text/*"] }));
app.use(cookieParser());

// ── Startup hook (startup log) ──────────────────────────────────────────────
const startupLog = [`App started at ${new Date().toLocaleTimeString()}`, `Loaded settings: app_name=${settings.appName}`];

// ── Timing middleware (adds an X-Process-Time header) ───────────────────────
app.use((req, res, next) => {
  const t0 = process.hrtime.bigint();
  res.on("finish", () => {}); // header must be set before send; use a wrapper below
  const start = Number(process.hrtime.bigint() - t0);
  res.set("X-Process-Time", `${start}ns`);
  next();
});

// ── 1. Stream data ──────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
app.get("/stream/text", async (_req, res) => {
  res.type("text/plain");
  for (let i = 0; i < 8; i += 1) {
    res.write(`chunk ${i}: ${"#".repeat(i + 1)}\n`);
    await sleep(250); // eslint-disable-line no-await-in-loop
  }
  res.end();
});
app.get("/stream/sse", async (_req, res) => {
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  for (let i = 0; i < 6; i += 1) {
    res.write(`data: ${JSON.stringify({ index: i, value: i * i })}\n\n`);
    await sleep(300); // eslint-disable-line no-await-in-loop
  }
  res.end();
});

// ── 3. Additional status codes (201 on create) ──────────────────────────────
const store = { "item-1": { name: "Existing item" } };
app.put("/advanced/items/:item_id", (req, res) => {
  const id = req.params.item_id;
  const name = req.query.name || "New item";
  if (store[id]) {
    store[id].name = name;
    return res.json({ item_id: id, name, action: "updated" });
  }
  store[id] = { name };
  return res.status(201).json({ item_id: id, name, action: "created" });
});

// ── 4-5. Return a response directly / custom responses ──────────────────────
app.get("/advanced/response-directly/json", (_req, res) => {
  res.set("X-Custom", "direct-response").json({ message: "Returned as JSON directly", custom_key: true });
});
app.get("/advanced/response-directly/xml", (_req, res) =>
  res.type("application/xml").send('<?xml version="1.0"?><root><message>Hello from XML</message></root>')
);
app.get("/advanced/custom/html", (_req, res) =>
  res.type("html").send(`<html><body style="font-family:monospace;background:#0d1117;color:#e6edf3;padding:2rem">
  <h1 style="color:#00d2ff">⚡ HTML response</h1><p>Express returned this as text/html.</p></body></html>`)
);
app.get("/advanced/custom/text", (_req, res) => res.type("text/plain").send("PlainText response.\nContent-Type: text/plain"));
app.get("/advanced/custom/redirect", (_req, res) => res.redirect(302, "/advanced/custom/text"));

// ── 6. Additional responses (404 model) ─────────────────────────────────────
app.get("/advanced/items/:item_id", (req, res) => {
  const id = req.params.item_id;
  if (!store[id]) return res.status(404).json({ detail: `Item '${id}' not found` });
  return res.json({ item_id: id, name: store[id].name });
});

// ── 7. Response cookies ─────────────────────────────────────────────────────
app.post("/advanced/cookies/set", (req, res) => {
  const value = req.query.value || "my-session-value";
  res.cookie("session_token", value, { httpOnly: true, maxAge: 3600_000 });
  res.json({ message: `Cookie 'session_token' set to '${value}'` });
});
app.get("/advanced/cookies/read", (req, res) => res.json({ session_token: req.cookies.session_token || "No cookie — set it first" }));
app.post("/advanced/cookies/delete", (_req, res) => {
  res.clearCookie("session_token");
  res.json({ message: "Cookie 'session_token' deleted" });
});

// ── 8-9. Response headers / dynamic status ──────────────────────────────────
app.get("/advanced/headers/custom", (_req, res) => {
  res.set("X-Custom-Header", "hello-from-express").set("X-Request-Id", crypto.randomBytes(8).toString("hex"));
  res.json({ message: "Check the response headers" });
});
app.get("/advanced/status/dynamic", (req, res) => {
  if (req.query.found !== "false") return res.json({ message: "Item found", status: 200 });
  return res.status(404).json({ message: "Item not found", status: 404 });
});

// ── 10. Advanced dependencies (class-based → middleware factory) ─────────────
const queryChecker = (minLength) => (req, res, next) => {
  const { q } = req.query;
  req.checkResult = q && q.length < minLength ? { q, valid: false, reason: `min length is ${minLength}` } : { q: q ?? null, valid: true };
  next();
};
app.get("/advanced/deps/short", queryChecker(3), (req, res) => res.json({ checker: "min=3", result: req.checkResult }));
app.get("/advanced/deps/long", queryChecker(10), (req, res) => res.json({ checker: "min=10", result: req.checkResult }));

// ── 11. HTTP Basic Auth ─────────────────────────────────────────────────────
app.get("/advanced/basic-auth", (req, res) => {
  const header = req.headers.authorization || "";
  const [scheme, encoded] = header.split(" ");
  const [user, pass] = scheme === "Basic" ? Buffer.from(encoded, "base64").toString().split(":") : [];
  const ok =
    user &&
    crypto.timingSafeEqual(Buffer.from(user || ""), Buffer.from("admin")) &&
    crypto.timingSafeEqual(Buffer.from(pass || ""), Buffer.from("password123"));
  if (!ok) {
    return res.status(401).set("WWW-Authenticate", "Basic").json({ detail: "Incorrect credentials (try admin / password123)" });
  }
  return res.json({ username: user, message: "Authenticated via HTTP Basic Auth" });
});

// ── 12. Using the request directly ──────────────────────────────────────────
app.get("/advanced/request-info", (req, res) =>
  res.json({
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    query_params: req.query,
    headers: Object.fromEntries(Object.entries(req.headers).filter(([k]) => ["user-agent", "accept", "host", "referer"].includes(k))),
    client: { host: req.socket.remoteAddress, port: req.socket.remotePort },
  })
);

// ── 15. Sub applications (an Express sub-router mounted on a path) ───────────
const subapp = express();
subapp.get("/", (_req, res) => res.json({ message: "Hello from the sub-application!" }));
app.use("/subapp", subapp);

// ── 16. Lifespan log ────────────────────────────────────────────────────────
app.get("/advanced/lifespan/log", (_req, res) => res.json({ startup_log: startupLog }));

// ── 18. Settings ────────────────────────────────────────────────────────────
app.get("/advanced/settings", (_req, res) =>
  res.json({ ...settings, tip: "Override with env vars: ADV_APP_NAME='My App' node advanced/server.js" })
);

// ── 19. JSON with bytes as base64 ───────────────────────────────────────────
app.post("/advanced/base64/encode", (req, res) => {
  const buf = Buffer.from(req.body.data ?? "", "utf8");
  res.json({ name: req.body.name, data_base64: buf.toString("base64"), data_length: buf.length });
});

// ── 24. Typed pagination ────────────────────────────────────────────────────
app.get("/advanced/pagination/paginated", (req, res) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.page_size ?? 3);
  const all = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
  const start = (page - 1) * pageSize;
  res.json({ items: all.slice(start, start + pageSize), total: all.length, page, page_size: pageSize });
});

// ── 17. WebSockets (ws on the HTTP server) ──────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
server.on("upgrade", (req, socket, head) => {
  const { pathname } = new URL(req.url, "http://localhost");
  if (pathname === "/ws/echo") {
    wss.handleUpgrade(req, socket, head, (ws) => ws.on("message", (m) => ws.send(`echo: ${m}`)));
  } else if (pathname === "/ws/counter") {
    wss.handleUpgrade(req, socket, head, async (ws) => {
      for (let i = 0; i < 10; i += 1) {
        if (ws.readyState !== ws.OPEN) return;
        ws.send(JSON.stringify({ count: i, square: i * i }));
        await sleep(500); // eslint-disable-line no-await-in-loop
      }
      ws.send(JSON.stringify({ done: true }));
    });
  } else {
    socket.destroy();
  }
});

if (require.main === module) {
  server.listen(8001, () => console.log("advanced app on http://localhost:8001"));
}

module.exports = { app, server };
