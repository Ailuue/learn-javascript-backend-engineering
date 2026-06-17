// Background task. `incrementClick` is the worker-side logic; its `.delay()`
// method enqueues a job for the worker to process.

const prisma = require("./database");
const { getClickQueue } = require("./queue");

// Worker-side: bump the persisted click counter for a slug.
async function incrementClick(shortCode) {
  await prisma.url.updateMany({
    where: { shortCode },
    data: { clickCount: { increment: 1 } },
  });
}

// Enqueue side — `.delay()` adds a click-increment job to the queue.
incrementClick.delay = async (shortCode) =>
  getClickQueue().add("increment", { shortCode });

module.exports = { incrementClick };
