/**
 * 04_reliability.js — Retries, Backoff, and Idempotency
 *
 * Real webhook delivery needs:
 *   1. Retries with exponential backoff (1s, 2s, 4s…) so a struggling receiver
 *      isn't hammered.
 *   2. At-least-once delivery — retrying means a receiver may get an event twice;
 *      the sender can't guarantee exactly-once.
 *   3. Idempotency on the receiver — track processed event IDs and skip dupes.
 *
 * Two Express apps in one module (sender + receiver). The /flaky endpoint fails
 * twice then succeeds, and the /processed count stays 1 thanks to idempotency.
 *
 * Run:  node 04_reliability.js   (receiver :8001, sender :8000)
 *   curl -X POST 'localhost:8000/webhooks/register?url=http://localhost:8001/flaky'
 *   curl -X POST 'localhost:8000/orders?item=headphones'
 *   curl localhost:8001/processed
 */

const crypto = require("crypto");
const express = require("express");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const MAX_ATTEMPTS = 5;
const BASE_DELAY = 1000; // ms, doubles each retry

// ── Sender ──────────────────────────────────────────────────────────────────

const senderApp = express();
senderApp.use(express.json());
const registeredUrls = [];

senderApp.post("/webhooks/register", (req, res) => {
  const { url } = req.query;
  if (url && !registeredUrls.includes(url)) registeredUrls.push(url);
  res.json({ registered: url });
});

senderApp.post("/orders", (req, res) => {
  const orderId = crypto.randomUUID().slice(0, 8);
  const event = {
    id: `evt_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    event: "order.created",
    timestamp: new Date().toISOString(),
    data: { order_id: orderId, item: req.query.item },
  };
  dispatchWithRetry(event, [...registeredUrls]);
  res.json({ order_id: orderId });
});

async function tryDeliver(url, body) {
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(5000),
    });
    return resp.status < 500;
  } catch {
    return false;
  }
}

async function dispatchWithRetry(event, urls) {
  const body = JSON.stringify(event);
  for (const url of urls) {
    let delivered = false;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      if (await tryDeliver(url, body)) {
        console.log(`[Delivered] ${event.event} → ${url} (attempt ${attempt})`);
        delivered = true;
        break;
      }
      const delay = BASE_DELAY * 2 ** (attempt - 1);
      console.log(`[Retry ${attempt}/${MAX_ATTEMPTS}] ${url} — backing off ${delay / 1000}s`);
      // eslint-disable-next-line no-await-in-loop
      if (attempt < MAX_ATTEMPTS) await sleep(delay);
    }
    if (!delivered) console.log(`[Dead letter] ${event.id} → ${url} gave up after ${MAX_ATTEMPTS} attempts`);
  }
}

// ── Receiver ────────────────────────────────────────────────────────────────

const receiverApp = express();
receiverApp.use(express.json());
const processedIds = new Set();
const processedLog = [];
let flakyCalls = 0;

receiverApp.post("/webhook", (req, res) => {
  const { id, event } = req.body;
  if (processedIds.has(id)) {
    console.log(`[Duplicate] ${id} — skipping`);
    return res.json({ status: "duplicate" });
  }
  processedIds.add(id);
  processedLog.push({ id, event });
  console.log(`[Processed] ${id}`);
  return res.json({ status: "ok" });
});

receiverApp.post("/flaky", (req, res) => {
  flakyCalls += 1;
  if (flakyCalls <= 2) {
    console.log(`[Flaky] call #${flakyCalls} — returning 500`);
    return res.status(500).json({ error: "temporary failure" });
  }
  const { id, event } = req.body;
  if (processedIds.has(id)) {
    console.log(`[Duplicate] ${id} — skipping (flaky endpoint)`);
    return res.json({ status: "duplicate" });
  }
  processedIds.add(id);
  processedLog.push({ id, event, via: "flaky" });
  console.log(`[Processed] ${id} (flaky endpoint, call #${flakyCalls})`);
  return res.json({ status: "ok" });
});

receiverApp.get("/processed", (_req, res) => res.json({ count: processedLog.length, events: processedLog }));

if (require.main === module) {
  receiverApp.listen(8001, () => console.log("receiver on http://localhost:8001"));
  senderApp.listen(8000, () => console.log("sender on http://localhost:8000"));
}

module.exports = { senderApp, receiverApp };
