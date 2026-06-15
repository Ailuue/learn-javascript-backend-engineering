// Tag routes — the JS analog of routers/tags.py.

const express = require("express");

const prisma = require("../database");
const { getCurrentUser } = require("../dependencies");
const { HttpError, asyncHandler } = require("../exceptions");
const { makeLogger } = require("../logging_config");
const { validateBody } = require("../validate");
const { tagCreate } = require("../schemas/tag");
const { tagPublic } = require("../schemas/serializers");

const router = express.Router();
const logger = makeLogger("app.routers.tags");

router.post(
  "/",
  getCurrentUser,
  validateBody(tagCreate),
  asyncHandler(async (req, res) => {
    const user = req.user;
    const existing = await prisma.tag.findFirst({
      where: { name: req.validated.name, userId: user.id },
    });
    if (existing) {
      // Idempotent: return the existing tag rather than erroring.
      return res.status(201).json(tagPublic(existing));
    }
    const tag = await prisma.tag.create({
      data: { name: req.validated.name, userId: user.id },
    });
    res.status(201).json(tagPublic(tag));
  })
);

router.get(
  "/",
  getCurrentUser,
  asyncHandler(async (req, res) => {
    const tags = await prisma.tag.findMany({
      where: { userId: req.user.id },
      orderBy: { name: "asc" },
    });
    res.json(tags.map(tagPublic));
  })
);

router.delete(
  "/:tagId",
  getCurrentUser,
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.tagId, 10);
    const tag = await prisma.tag.findUnique({ where: { id } });
    if (!tag || tag.userId !== req.user.id) {
      throw new HttpError(404, "Tag not found");
    }
    await prisma.tag.delete({ where: { id } });
    logger.info(`User ${req.user.username} deleted tag ${id}`);
    res.status(204).end();
  })
);

module.exports = router;
