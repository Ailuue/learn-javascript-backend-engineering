# Webhooks

A webhook is an HTTP POST one service sends another when an event happens. These
demos use Express, Node's built-in `fetch`, and `node:crypto` (no extra deps).

| File | What it teaches |
|---|---|
| `01_receiver.js` | Accept the POST, return 2xx fast, process async |
| `02_sender.js` | Register URLs, POST events to all of them, fire-and-forget |
| `03_signing.js` | HMAC-SHA256 signatures, replay protection, constant-time compare |
| `04_reliability.js` | Retries with exponential backoff + receiver idempotency |

## Run

```bash
npm install                 # from the repo root (express)
node 03_signing.js          # standalone crypto demo

node 01_receiver.js         # terminal A (:8001)
node 02_sender.js           # terminal B (:8000)
curl -X POST 'localhost:8000/webhooks/register?url=http://localhost:8001/webhook'
curl -X POST 'localhost:8000/orders?item=keyboard'
curl localhost:8001/events
```

## Python → JS

| Python | JS |
|--------|-----|
| `hmac.new(secret, msg, sha256).hexdigest()` | `crypto.createHmac("sha256", secret).update(msg).digest("hex")` |
| `hmac.compare_digest(a, b)` | `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))` |
| `httpx.AsyncClient().post(...)` | `fetch(url, { method: "POST", body })` |
| `asyncio.create_task(...)` | call the async fn without awaiting (or `setImmediate`) |
