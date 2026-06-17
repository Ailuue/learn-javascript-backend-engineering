// Background-job infrastructure. BullMQ is a Redis-backed queue with separate
// worker processes. The queue is constructed lazily so importing this module
// never opens a Redis connection on its own.

const { Queue } = require("bullmq");

const { getSettings } = require("./config");

const CLICK_QUEUE = "increment_click";

function redisConnection() {
  const url = new URL(getSettings().redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    db: Number(url.pathname.slice(1) || 0),
  };
}

let clickQueue = null;

function getClickQueue() {
  if (clickQueue === null) {
    clickQueue = new Queue(CLICK_QUEUE, { connection: redisConnection() });
  }
  return clickQueue;
}

module.exports = { CLICK_QUEUE, redisConnection, getClickQueue };
