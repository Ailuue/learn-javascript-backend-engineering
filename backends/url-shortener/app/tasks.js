// Background task — the JS analog of tasks.py. `incrementClick` is the
// worker-side logic; its `.delay()` method enqueues a job, mirroring Celery's
// `increment_click.delay(short_code)`.

const prisma = require("./database");
const { getClickQueue } = require("./celery_app");

// Worker-side: bump the persisted click counter for a slug.
async function incrementClick(shortCode) {
  await prisma.url.updateMany({
    where: { shortCode },
    data: { clickCount: { increment: 1 } },
  });
}

// Enqueue side — the JS analog of `increment_click.delay(short_code)`.
incrementClick.delay = async (shortCode) =>
  getClickQueue().add("increment", { shortCode });

module.exports = { incrementClick };
