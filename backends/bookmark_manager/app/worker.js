// Background worker — the JS analog of running `celery worker` + `celery beat`.
// Processes metadata-fetch jobs and runs the write-behind click flush on a
// repeatable 10-minute schedule (Celery Beat's `flush-bookmark-clicks` entry).

const { Worker, Queue } = require("bullmq");

const {
  METADATA_QUEUE,
  CLICK_FLUSH_QUEUE,
  redisConnection,
} = require("./celery_app");
const { fetchBookmarkMetadata, flushBookmarkClicks } = require("./tasks");
const { makeLogger } = require("./logging_config");

const logger = makeLogger("app.worker");
const connection = redisConnection();

const metadataWorker = new Worker(
  METADATA_QUEUE,
  async (job) => fetchBookmarkMetadata(job.data.bookmarkId, job.data.url),
  { connection }
);

const flushWorker = new Worker(CLICK_FLUSH_QUEUE, async () => flushBookmarkClicks(), {
  connection,
});

// Schedule the flush every 10 minutes (Celery Beat's crontab(minute="*/10")).
const flushQueue = new Queue(CLICK_FLUSH_QUEUE, { connection });
flushQueue.add(
  "flush",
  {},
  { repeat: { pattern: "*/10 * * * *" }, removeOnComplete: true }
);

for (const worker of [metadataWorker, flushWorker]) {
  worker.on("failed", (job, err) => logger.error(`Job ${job?.id} failed: ${err.message}`));
}

logger.info("Bookmark manager worker started");
