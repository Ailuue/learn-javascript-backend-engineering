/**
 * 02_sender.js — The Sender Side
 *
 * Now our service fires webhooks when something happens:
 *   1. Consumers register a URL with us.
 *   2. On an event, we POST to every registered URL.
 *   3. We don't block the main request on delivery.
 *
 * Uses the built-in `fetch` (Node 18+) — no HTTP-client dependency needed.
 *
 * Run (with 01_receiver.js on :8001):  node 02_sender.js   (listens on :8000)
 *   curl -X POST 'localhost:8000/webhooks/register?url=http://localhost:8001/webhook'
 *   curl -X POST 'localhost:8000/orders?item=keyboard'
 */

const crypto = require("crypto");
const express = require("express");

const app = express();
app.use(express.json());

const registeredUrls = [];

app.post("/webhooks/register", (req, res) => {
  const { url } = req.query;
  if (url && !registeredUrls.includes(url)) registeredUrls.push(url);
  res.json({ registered: url, total_registered: registeredUrls.length });
});

app.get("/webhooks", (_req, res) => res.json(registeredUrls));

app.post("/orders", (req, res) => {
  const orderId = crypto.randomUUID().slice(0, 8);
  const event = {
    id: `evt_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    event: "order.created",
    timestamp: new Date().toISOString(),
    data: { order_id: orderId, item: req.query.item },
  };
  // Fire and forget — the response doesn't wait for delivery.
  dispatchWebhooks(event);
  res.json({ order_id: orderId, status: "created" });
});

async function dispatchWebhooks(event) {
  const body = JSON.stringify(event);
  await Promise.all(
    registeredUrls.map(async (url) => {
      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: AbortSignal.timeout(5000),
        });
        console.log(`[Dispatched] ${event.event} → ${url} (${resp.status})`);
      } catch (err) {
        console.log(`[Dispatch failed] ${url}: ${err.message}`);
      }
    })
  );
}

if (require.main === module) {
  app.listen(8000, () => console.log("sender on http://localhost:8000"));
}

module.exports = { app };
