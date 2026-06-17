/**
 * Concept 04 — Workflows: chains, groups, fan-in (BullMQ Flows)
 *
 * BullMQ composes multi-step work with **Flows**: a tree of jobs where children
 * run before their parent, and a parent reads its children's return values via
 * `job.getChildrenValues()`.
 *
 *   chain (a → b → c, each result feeds the next)
 *     ── Model as a nested flow, one child per level. The deepest child runs
 *        first; each parent runs once its single child finishes and reads that
 *        child's value. Tree: store ← parse ← download.
 *
 *   group (a, b, c run in parallel, collect results)
 *     ── Just add N independent jobs and await them all. No flow needed.
 *
 *   chord (group in parallel, then ONE callback with all results)
 *     ── A flow: the callback is the parent, the group are its children. The
 *        parent stays in `waiting-children` until every child completes, then
 *        runs with all their values. This is the scatter-gather / map-reduce shape.
 *
 * `getChildrenValues()` returns an object keyed by the child's full job key
 * (`bull:<queue>:<id>`), so we take `Object.values(...)` to get the results.
 *
 * HOW TO RUN THIS FILE:
 *   Terminal 1:  docker compose up
 *   Terminal 2:  node 04_workflows.js
 */

const { Queue, Worker, QueueEvents, FlowProducer } = require("bullmq");
const { connection } = require("./connection");

const QUEUE_NAME = "workflows";

// ---------------------------------------------------------------------------
// Job logic — parents read upstream results from getChildrenValues().
// ---------------------------------------------------------------------------

async function childValues(job) {
  return Object.values(await job.getChildrenValues());
}

async function download(url) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { url, content: `<html>${url}</html>`, sizeKb: url.length * 10 };
}

async function parse(job) {
  const [downloaded] = await childValues(job); // download()'s result
  return {
    url: downloaded.url,
    words: downloaded.content.split(/\s+/).length,
    sizeKb: downloaded.sizeKb,
  };
}

async function store(job) {
  const [parsed] = await childValues(job); // parse()'s result
  return `Stored: ${parsed.url} (${parsed.words} words)`;
}

async function resizeImage(imageId, size) {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return { imageId, size, path: `/img/${imageId}_${size}.jpg` };
}

async function aggregate(job) {
  const results = await childValues(job);
  return { total: results.length, summary: results.map((r) => r.path) };
}

async function multiplyByChild(job) {
  const [childResult] = await childValues(job);
  return childResult * job.data.factor;
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(60));
  console.log("CONCEPT 04 — Workflows (chains / groups / fan-in)");
  console.log("=".repeat(60));

  const queue = new Queue(QUEUE_NAME, { connection });
  const queueEvents = new QueueEvents(QUEUE_NAME, { connection });
  await queueEvents.waitUntilReady();
  const flow = new FlowProducer({ connection });

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      switch (job.name) {
        case "download":
          return download(job.data.url);
        case "parse":
          return parse(job);
        case "store":
          return store(job);
        case "resize":
          return resizeImage(job.data.imageId, job.data.size);
        case "aggregate":
          return aggregate(job);
        case "add":
          return job.data.x + job.data.y;
        case "multiply":
          return multiplyByChild(job);
        default:
          throw new Error(`Unknown job: ${job.name}`);
      }
    },
    { connection, concurrency: 4 }
  );

  // ── 1. chain — sequential pipeline (download → parse → store) ──────────────
  console.log("\n1. chain — sequential pipeline (download → parse → store):");
  const chainTree = await flow.add({
    name: "store",
    queueName: QUEUE_NAME,
    children: [
      {
        name: "parse",
        queueName: QUEUE_NAME,
        children: [
          { name: "download", queueName: QUEUE_NAME, data: { url: "https://example.com/page" } },
        ],
      },
    ],
  });
  console.log(`   Result: ${await chainTree.job.waitUntilFinished(queueEvents)}`);

  // ── 2. group — parallel fan-out (one image in 3 sizes at once) ─────────────
  console.log("\n2. group — parallel fan-out (resize one image in 3 sizes):");
  const sizes = ["small", "medium", "large"];
  const groupJobs = await Promise.all(
    sizes.map((size) => queue.add("resize", { imageId: 42, size }))
  );
  const groupResults = await Promise.all(
    groupJobs.map((j) => j.waitUntilFinished(queueEvents))
  );
  for (const r of groupResults) console.log(`   ${JSON.stringify(r)}`);

  // ── 3. chord — parallel fan-out + single callback (map-reduce) ─────────────
  console.log("\n3. chord — fan-out + single fan-in callback:");
  const imageIds = [10, 11, 12, 13];
  const chordTree = await flow.add({
    name: "aggregate",
    queueName: QUEUE_NAME,
    children: imageIds.map((imageId) => ({
      name: "resize",
      queueName: QUEUE_NAME,
      data: { imageId, size: "thumb" },
    })),
  });
  console.log(`   Aggregated: ${JSON.stringify(await chordTree.job.waitUntilFinished(queueEvents))}`);

  // ── 4. arithmetic chain — value passing in action ─────────────────────────
  console.log("\n4. Arithmetic chain — add(1,2)=3, then multiply(3,10):");
  const mathTree = await flow.add({
    name: "multiply",
    queueName: QUEUE_NAME,
    data: { factor: 10 },
    children: [{ name: "add", queueName: QUEUE_NAME, data: { x: 1, y: 2 } }],
  });
  console.log(`   Result: ${await mathTree.job.waitUntilFinished(queueEvents)}`);

  await worker.close();
  await flow.close();
  await queueEvents.close();
  await queue.close();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { download, parse, store, resizeImage, aggregate, QUEUE_NAME };
