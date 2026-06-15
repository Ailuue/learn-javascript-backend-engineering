# FastAPI Tutorial → Express

The official FastAPI tutorial, translated to the 2026 Node stack: **Express**,
with **Zod** for validation (Pydantic's role), **multer** for uploads,
**cookie-parser** for cookies, **better-sqlite3** for the DB (SQLModel's role),
and **ws** for WebSockets.

## Structure

```
tutorial/server.js   — core concepts (path/query params, bodies, validation,
                       files, cookies, headers, errors, SQLite CRUD)
advanced/server.js   — advanced guide (streaming, SSE, custom responses,
                       basic auth, sub-apps, WebSockets, settings, pagination)
```

## Running

```bash
npm install                  # from the repo root
node tutorial/server.js      # http://localhost:8000
node advanced/server.js      # http://localhost:8001
```

```bash
curl 'localhost:8000/items/42?q=hi'
curl -X POST localhost:8000/items -H 'Content-Type: application/json' -d '{"name":"Foo","price":35.4,"tax":3.2}'
curl -N localhost:8001/stream/sse
curl -u admin:password123 localhost:8001/advanced/basic-auth
```

## FastAPI → Express cheat sheet

| FastAPI | Express |
|---------|---------|
| `@app.get("/items/{id}")`, `item_id: str` | `app.get("/items/:item_id")`, `req.params.item_id` |
| query params (`q: str = None`) | `req.query.q` |
| Pydantic `BaseModel` | Zod schema + `safeParse` (422 on failure) |
| `Depends(...)` | middleware / middleware factory |
| `File`/`UploadFile`/`Form` | `multer` |
| `Cookie()` / `Response.set_cookie` | `cookie-parser` / `res.cookie` |
| `Header()` | `req.headers` |
| `HTTPException` / `@app.exception_handler` | `res.status().json()` / error-handling middleware |
| `StreamingResponse` | `res.write(...)` + `res.end()` |
| `@app.websocket(...)` | `ws` `WebSocketServer` on the HTTP server |
| `app.mount("/subapp", subapp)` | `app.use("/subapp", subRouter)` |
| SQLModel + `create_engine` | better-sqlite3 (or Prisma) |
| `BaseSettings` | `process.env` |
