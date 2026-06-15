/**
 * Concept 02 — Job States & Progress
 *
 * Every BullMQ job moves through a lifecycle, stored in Redis:
 *
 *   waiting → active → completed
 *                    ↘ failed
 *           ↘ delayed (scheduled for later, then back to waiting)
 *
 * (There's also `waiting-children` for flows, and `prioritized`.)
 *
 * Compared to Celery:
 *   - Celery's PENDING is reported for *any* id, even unknown ones, because the
 *     result backend has no record. BullMQ is the opposite: an unknown job id
 *     resolves to state "unknown" — the queue genuinely doesn't have it.
 *   - Celery's `update_state(meta=...)` for progress maps to `job.updateProgress()`.
 *     Progress can be a number or an object and is delivered live via QueueEvents
 *     ("progress") or read from `job.progress`.
 *   - On failure, the thrown Error's message + stack are stored on the job
 *     (`job.failedReason`, `job.stacktrace`) — the analog of Celery storing the
 *     exception and traceback.
 *
 * HOW TO RUN THIS FILE:
 *   Terminal 1:  docker compose up
 *   Terminal 2:  node 02_task_states.js
 */

const { Queue, Worker, QueueEvents, Job } = require("bullmq");
const { connection } = require("./connection");

const QUEUE_NAME = "task_states";

// ---------------------------------------------------------------------------
// Job logic
// ---------------------------------------------------------------------------

async function longRunningJob(job, steps) {
  for (let i = 0; i < steps; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    // updateProgress pushes a custom payload a caller can read live — the
    // direct analog of Celery's self.update_state(meta={...}).
    await job.updateProgress({
      current: i + 1,
      total: steps,
      pct: Math.round(((i + 1) / steps) * 100),
    });
  }
  return { message: "done", stepsCompleted: steps };
}

function alwaysFails() {
  throw new Error("This job always raises an exception.");
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(60));
  console.log("CONCEPT 02 — Job States & Progress");
  console.log("=".repeat(60));

  const queue = new Queue(QUEUE_NAME, { connection });
  const queueEvents = new QueueEvents(QUEUE_NAME, { connection });
  await queueEvents.waitUntilReady();

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === "longRunningJob") return longRunningJob(job, job.data.steps);
      if (job.name === "alwaysFails") return alwaysFails();
      throw new Error(`Unknown job: ${job.name}`);
    },
    { connection }
  );

  // --- Normal lifecycle with live progress ---
  console.log("\n1. Normal lifecycle (waiting → active → completed), with progress:");
  const seen = new Set();
  const onProgress = ({ jobId, data }) => {
    const key = JSON.stringify(data);
    if (!seen.has(key)) {
      console.log(`     progress job=${jobId.slice(0, 8)}… ${key}`);
      seen.add(key);
    }
  };
  queueEvents.on("progress", onProgress);

  const job = await queue.add("longRunningJob", { steps: 4 });
  const result = await job.waitUntilFinished(queueEvents);
  queueEvents.off("progress", onProgress);
  console.log(`   Final state: ${await job.getState()}`);
  console.log(`   Result:      ${JSON.stringify(result)}`);

  // --- Failure state ---
  console.log("\n2. Failure state:");
  const failing = await queue.add("alwaysFails", {}, { attempts: 1 });
  try {
    await failing.waitUntilFinished(queueEvents);
  } catch (err) {
    console.log(`   waitUntilFinished rejected: ${err.message}`);
  }
  const reloaded = await Job.fromId(queue, failing.id);
  console.log(`   State:        ${await reloaded.getState()}`);
  console.log(`   failedReason: ${reloaded.failedReason}`);
  console.log(`   stack (1st line): ${reloaded.stacktrace?.[0]?.split("\n")[0]}`);

  // --- Unknown job id ---
  console.log("\n3. Unknown job id resolves to 'unknown' (not PENDING like Celery):");
  const ghost = await Job.fromId(queue, "does-not-exist");
  console.log(`   Job lookup: ${ghost}`); // undefined — no record in Redis

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

module.exports = { longRunningJob, alwaysFails, QUEUE_NAME };
