/**
 * Concept 03 — Retries & Backoff
 *
 * Background jobs hit transient failures: a third-party API is down, a DB
 * connection times out, a rate limit kicks in. BullMQ retries a job whenever its
 * processor throws, as long as attempts remain.
 *
 * BullMQ has one retry model — per-job options:
 *
 *   queue.add("job", data, {
 *     attempts: 5,                              // total tries (1 initial + 4 retries)
 *     backoff: { type: "exponential", delay: 1000 },  // 1s, 2s, 4s, 8s …
 *   })
 *
 * Built-in backoff strategies are "fixed" and "exponential". For jitter (to
 * avoid the thundering-herd problem) or any custom curve, register a named
 * strategy on the Worker via `settings.backoffStrategy` and reference it by name.
 *
 * To *stop* retrying early (e.g. a permanent 404, invalid input), throw an
 * `UnrecoverableError` — BullMQ moves the job straight to `failed`, ignoring any
 * remaining attempts. That's the equivalent of "don't bother calling retry".
 *
 * HOW TO RUN THIS FILE:
 *   Terminal 1:  docker compose up
 *   Terminal 2:  node 03_retries.js
 */

const { Queue, Worker, QueueEvents, UnrecoverableError } = require("bullmq");
const { connection } = require("./connection");

const QUEUE_NAME = "retries";

// ---------------------------------------------------------------------------
// Simulate an unreliable external service. Keyed by job id so each demo job
// tracks its own attempt count across retries.
// ---------------------------------------------------------------------------

const callCounts = new Map();

function flakyApiCall(key, failTimes) {
  const attempt = (callCounts.get(key) ?? 0) + 1;
  callCounts.set(key, attempt);
  if (attempt <= failTimes) {
    throw new Error(`API unavailable (attempt ${attempt}/${failTimes + 1})`);
  }
  return `API response (succeeded on attempt ${attempt})`;
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(60));
  console.log("CONCEPT 03 — Retries & Backoff");
  console.log("=".repeat(60));

  const queue = new Queue(QUEUE_NAME, { connection });
  const queueEvents = new QueueEvents(QUEUE_NAME, { connection });
  await queueEvents.waitUntilReady();

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      console.log(`   [worker] ${job.name} attempt ${job.attemptsMade + 1}`);
      if (job.name === "fetchPermanentFail") {
        // A failure we know retrying can't fix — bail out immediately.
        throw new UnrecoverableError("Resource gone (404) — no point retrying.");
      }
      return flakyApiCall(job.name, job.data.failTimes);
    },
    {
      connection,
      // Named backoff strategy adding jitter on top of exponential growth.
      settings: {
        backoffStrategy: (attemptsMade) => {
          const base = 2 ** attemptsMade * 1000;
          return base + Math.floor(Math.random() * 1000);
        },
      },
    }
  );

  // --- Exponential backoff, succeeds before exhausting attempts ---
  console.log("\n1. Exponential backoff (fails 2x, then succeeds):");
  const j1 = await queue.add(
    "fetchExponential",
    { failTimes: 2 },
    { attempts: 5, backoff: { type: "exponential", delay: 500 } }
  );
  console.log(`   Result: ${await j1.waitUntilFinished(queueEvents)}`);

  // --- Custom backoff with jitter ---
  console.log("\n2. Custom backoff strategy with jitter (fails 2x, then succeeds):");
  const j2 = await queue.add(
    "fetchJitter",
    { failTimes: 2 },
    { attempts: 5, backoff: { type: "custom" } }
  );
  console.log(`   Result: ${await j2.waitUntilFinished(queueEvents)}`);

  // --- Exhausts attempts → failed ---
  console.log("\n3. Exhausts attempts (fails 5x, only 3 attempts allowed):");
  const j3 = await queue.add(
    "fetchExhaust",
    { failTimes: 5 },
    { attempts: 3, backoff: { type: "fixed", delay: 300 } }
  );
  try {
    await j3.waitUntilFinished(queueEvents);
  } catch (err) {
    console.log(`   Final failure: ${err.message}`);
  }

  // --- UnrecoverableError short-circuits remaining attempts ---
  console.log("\n4. UnrecoverableError gives up immediately (despite attempts: 5):");
  const j4 = await queue.add("fetchPermanentFail", {}, { attempts: 5 });
  try {
    await j4.waitUntilFinished(queueEvents);
  } catch (err) {
    console.log(`   Failed after ${j4.attemptsMade ?? 1} attempt(s): ${err.message}`);
  }

  await worker.close();
  await queueEvents.close();
  await queue.close();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { flakyApiCall, QUEUE_NAME };
