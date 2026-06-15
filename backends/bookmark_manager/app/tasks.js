// Background tasks — the JS analog of tasks.py.
//
// `fetchBookmarkMetadata` is the worker-side logic; its `.delay()` method
// enqueues a job (mirroring Celery's `task.delay(...)`). Tests stub `.delay` so
// no broker is needed. `flushBookmarkClicks` is the write-behind flush, called
// directly by tests and by the scheduled worker.

const prisma = require("./database");
const { getMetadataQueue } = require("./celery_app");
const { getRedis } = require("./redis_client");
const { makeLogger } = require("./logging_config");

const logger = makeLogger("app.tasks");

const TITLE_PATTERN = /<title[^>]*>(.*?)<\/title>/is;
const CLICK_KEY_PREFIX = "bookmark_clicks:";

// Fetch the <title> at `url` and overwrite the bookmark's title if it's still
// the URL.
async function fetchBookmarkMetadata(bookmarkId, url) {
  let response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": "BookmarkManager/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Network error — Celery would autoretry; BullMQ retries are configured on
    // the worker, so here we just give up on this attempt.
    return;
  }

  if (!response.ok) {
    logger.warning(`HTTP ${response.status} fetching metadata for bookmark ${bookmarkId}`);
    return;
  }

  const body = await response.text();
  const match = TITLE_PATTERN.exec(body);
  if (!match) {
    logger.info(`No <title> found for bookmark ${bookmarkId} (${url})`);
    return;
  }

  const title = match[1].trim().slice(0, 300);
  const bookmark = await prisma.bookmark.findUnique({ where: { id: bookmarkId } });
  if (bookmark && bookmark.title === bookmark.url) {
    await prisma.bookmark.update({ where: { id: bookmarkId }, data: { title } });
    logger.info(`Updated bookmark ${bookmarkId} with title: ${title}`);
  }
}

// Enqueue side — the JS analog of Celery's `fetch_bookmark_metadata.delay(...)`.
fetchBookmarkMetadata.delay = async (bookmarkId, url) =>
  getMetadataQueue().add("fetch", { bookmarkId, url });

// Read and remove every `bookmark_clicks:*` counter atomically, returning the
// pending counts so SCAN + GETDEL can't drop clicks that arrive mid-scan.
async function drainClickCounters() {
  const redis = getRedis();
  const pending = new Map();
  let cursor = "0";
  do {
    const [next, keys] = await redis.scan(
      cursor,
      "MATCH",
      `${CLICK_KEY_PREFIX}*`,
      "COUNT",
      100
    );
    cursor = next;
    for (const key of keys) {
      const value = await redis.getdel(key);
      if (value === null) continue;
      const bookmarkId = Number.parseInt(key.split(":")[1], 10);
      const count = Number.parseInt(value, 10);
      if (Number.isNaN(bookmarkId) || Number.isNaN(count)) {
        logger.warning(`Skipping malformed click key: ${key}`);
        continue;
      }
      if (count > 0) pending.set(bookmarkId, count);
    }
  } while (cursor !== "0");
  return pending;
}

// Drain `bookmark_clicks:*` counters from Redis and apply them to the DB.
// Scheduled every 10 minutes by the worker. This is the write-behind flush.
async function flushBookmarkClicks() {
  const pending = await drainClickCounters();

  if (pending.size === 0) {
    logger.info("flushBookmarkClicks: nothing to flush");
    return { flushed: 0, bookmarks: 0 };
  }

  let total = 0;
  for (const [bookmarkId, count] of pending) {
    const bookmark = await prisma.bookmark.findUnique({ where: { id: bookmarkId } });
    if (bookmark === null) {
      logger.warning(`Bookmark ${bookmarkId} no longer exists; dropping ${count} clicks`);
      continue;
    }
    await prisma.bookmark.update({
      where: { id: bookmarkId },
      data: { clickCount: bookmark.clickCount + count },
    });
    total += count;
  }

  logger.info(`flushBookmarkClicks: applied ${total} clicks across ${pending.size} bookmarks`);
  return { flushed: total, bookmarks: pending.size };
}

module.exports = { fetchBookmarkMetadata, flushBookmarkClicks, CLICK_KEY_PREFIX };
