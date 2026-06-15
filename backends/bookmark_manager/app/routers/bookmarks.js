// Bookmark routes — the JS analog of routers/bookmarks.py.

const express = require("express");

const prisma = require("../database");
const { getCurrentUser } = require("../dependencies");
const { HttpError, asyncHandler } = require("../exceptions");
const { limit } = require("../rate_limit");
const { getRedis } = require("../redis_client");
const { makeLogger } = require("../logging_config");
const { validateBody } = require("../validate");
const { bookmarkCreate, bookmarkUpdate } = require("../schemas/bookmark");
const { bookmarkPublic } = require("../schemas/serializers");
const { fetchBookmarkMetadata, CLICK_KEY_PREFIX } = require("../tasks");

const router = express.Router();
const logger = makeLogger("app.routers.bookmarks");

// Mirrors `_get_or_create_tag` via Prisma's connectOrCreate using the
// (name, user_id) composite unique constraint.
function tagConnectOrCreate(userId, names) {
  return names.map((name) => ({
    where: { uq_tag_name_user: { name, userId } },
    create: { name, userId },
  }));
}

async function validateCategory(userId, categoryId) {
  if (categoryId === null || categoryId === undefined) return;
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || category.userId !== userId) {
    throw new HttpError(404, "Category not found");
  }
}

router.post(
  "/",
  getCurrentUser,
  limit(30),
  validateBody(bookmarkCreate),
  asyncHandler(async (req, res) => {
    const user = req.user;
    const input = req.validated;
    await validateCategory(user.id, input.category_id);

    const url = input.url;
    const bookmark = await prisma.bookmark.create({
      data: {
        url,
        title: input.title || url,
        description: input.description ?? null,
        favorite: input.favorite,
        categoryId: input.category_id ?? null,
        userId: user.id,
        tags: { connectOrCreate: tagConnectOrCreate(user.id, input.tags) },
      },
      include: { tags: true },
    });

    if (!input.title) {
      await fetchBookmarkMetadata.delay(bookmark.id, url);
    }

    logger.info(`User ${user.username} created bookmark ${bookmark.id}`);
    res.status(201).json(bookmarkPublic(bookmark));
  })
);

router.get(
  "/",
  getCurrentUser,
  asyncHandler(async (req, res) => {
    const user = req.user;
    const where = { userId: user.id };
    if (req.query.category_id !== undefined) {
      where.categoryId = Number.parseInt(req.query.category_id, 10);
    }
    if (req.query.favorite !== undefined) {
      where.favorite = req.query.favorite === "true";
    }
    if (req.query.tag !== undefined) {
      where.tags = { some: { name: req.query.tag } };
    }
    const offset = Number.parseInt(req.query.offset ?? "0", 10);
    const limitParam = Math.min(Number.parseInt(req.query.limit ?? "50", 10), 100);

    const bookmarks = await prisma.bookmark.findMany({
      where,
      include: { tags: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: offset,
      take: limitParam,
    });
    res.json(bookmarks.map(bookmarkPublic));
  })
);

router.get(
  "/:bookmarkId",
  getCurrentUser,
  asyncHandler(async (req, res) => {
    const bookmark = await prisma.bookmark.findUnique({
      where: { id: Number.parseInt(req.params.bookmarkId, 10) },
      include: { tags: true },
    });
    if (!bookmark || bookmark.userId !== req.user.id) {
      throw new HttpError(404, "Bookmark not found");
    }
    res.json(bookmarkPublic(bookmark));
  })
);

router.patch(
  "/:bookmarkId",
  getCurrentUser,
  validateBody(bookmarkUpdate),
  asyncHandler(async (req, res) => {
    const user = req.user;
    const id = Number.parseInt(req.params.bookmarkId, 10);
    const existing = await prisma.bookmark.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      throw new HttpError(404, "Bookmark not found");
    }

    const input = req.validated;
    const data = {};
    // Apply only fields the client actually sent (exclude_unset semantics).
    if (input.url !== undefined) data.url = input.url;
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.favorite !== undefined) data.favorite = input.favorite;
    if (input.category_id !== undefined) {
      await validateCategory(user.id, input.category_id);
      data.categoryId = input.category_id;
    }
    data.updatedAt = new Date();

    if (input.tags != null) {
      data.tags = { set: [], connectOrCreate: tagConnectOrCreate(user.id, input.tags) };
    }

    const bookmark = await prisma.bookmark.update({
      where: { id },
      data,
      include: { tags: true },
    });
    logger.info(`User ${user.username} updated bookmark ${bookmark.id}`);
    res.json(bookmarkPublic(bookmark));
  })
);

router.delete(
  "/:bookmarkId",
  getCurrentUser,
  asyncHandler(async (req, res) => {
    const user = req.user;
    const id = Number.parseInt(req.params.bookmarkId, 10);
    const bookmark = await prisma.bookmark.findUnique({ where: { id } });
    if (!bookmark || bookmark.userId !== user.id) {
      throw new HttpError(404, "Bookmark not found");
    }
    await prisma.bookmark.delete({ where: { id } });
    logger.info(`User ${user.username} deleted bookmark ${id}`);
    res.status(204).end();
  })
);

// Increment the click counter for a bookmark in Redis. The DB column is updated
// every 10 minutes by flushBookmarkClicks — a write-behind cache.
router.post(
  "/:bookmarkId/click",
  getCurrentUser,
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.bookmarkId, 10);
    const bookmark = await prisma.bookmark.findUnique({ where: { id } });
    if (!bookmark || bookmark.userId !== req.user.id) {
      throw new HttpError(404, "Bookmark not found");
    }
    await getRedis().incr(`${CLICK_KEY_PREFIX}${id}`);
    res.status(204).end();
  })
);

module.exports = router;
