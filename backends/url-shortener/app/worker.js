// Background worker — the JS analog of running `celery worker`. Processes
// click-increment jobs off the BullMQ queue.

const { Worker } = require("bullmq");

const { CLICK_QUEUE, redisConnection } = require("./celery_app");
const { incrementClick } = require("./tasks");

const worker = new Worker(
  CLICK_QUEUE,
  async (job) => incrementClick(job.data.shortCode),
  { connection: redisConnection(), concurrency: 4 }
);

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed: ${err.message}`);
});

console.log("URL shortener worker started");
