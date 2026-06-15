/**
 * 01_receiver.js — The Receiver Side
 *
 * A webhook is just an HTTP POST someone else sends to your server (GitHub merges
 * a PR, Stripe processes a payment, …). Your job:
 *   1. Accept the POST.
 *   2. Return 2xx FAST, before doing real work.
 *   3. Do the actual work asynchronously / on a queue.
 *
 * Respond fast because senders have short timeouts (5–30s) and will retry — and
 * re-deliver the same event — if you're slow.
 *
 * Run:  node 01_receiver.js   (listens on :8001)
 *   curl -X POST localhost:8001/webhook -H 'Content-Type: application/json' \
 *     -d '{"event":"order.created","id":"evt_001","data":{"order_id":42}}'
 */

const express = require("express");

const app = express();
app.use(express.json());

const receivedEvents = [];

app.post("/webhook", (req, res) => {
  const payload = req.body;
  receivedEvents.push({
    received_at: new Date().toISOString(),
    event: payload.event,
    id: payload.id,
    payload,
  });
  console.log(`[Received] ${payload.event} id=${payload.id}`);

  // Kick off work without blocking the response. In production: enqueue instead.
  setImmediate(() => console.log(`[Processing] ${payload.event}: ${JSON.stringify(payload.data)}`));

  res.json({ status: "accepted" });
});

app.get("/events", (_req, res) => res.json(receivedEvents));

if (require.main === module) {
  app.listen(8001, () => console.log("receiver on http://localhost:8001"));
}

module.exports = { app };
