// Background-job infrastructure — the JS analog of celery_app.py. BullMQ is the
// Node equivalent of Celery: a Redis-backed queue with separate worker
// processes. The queue is constructed lazily so that importing this module
// (e.g. in tests, which stub the enqueue side) never opens a Redis connection.

const { Queue } = require("bullmq");

const { getSettings } = require("./config");

const METADATA_QUEUE = "bookmark_metadata";
const CLICK_FLUSH_QUEUE = "bookmark_click_flush";

function redisConnection() {
  const url = new URL(getSettings().celeryBrokerUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    db: Number(url.pathname.slice(1) || 0),
  };
}

let metadataQueue = null;

function getMetadataQueue() {
  if (metadataQueue === null) {
    metadataQueue = new Queue(METADATA_QUEUE, { connection: redisConnection() });
  }
  return metadataQueue;
}

module.exports = {
  METADATA_QUEUE,
  CLICK_FLUSH_QUEUE,
  redisConnection,
  getMetadataQueue,
};
