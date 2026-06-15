// Category routes — the JS analog of routers/categories.py.

const express = require("express");

const prisma = require("../database");
const { getCurrentUser } = require("../dependencies");
const { HttpError, asyncHandler } = require("../exceptions");
const { makeLogger } = require("../logging_config");
const { validateBody } = require("../validate");
const { categoryCreate, categoryUpdate } = require("../schemas/category");
const { categoryPublic } = require("../schemas/serializers");

const router = express.Router();
const logger = makeLogger("app.routers.categories");

router.post(
  "/",
  getCurrentUser,
  validateBody(categoryCreate),
  asyncHandler(async (req, res) => {
    const user = req.user;
    const input = req.validated;
    const existing = await prisma.category.findFirst({
      where: { name: input.name, userId: user.id },
    });
    if (existing) {
      throw new HttpError(400, "A category with that name already exists");
    }
    const category = await prisma.category.create({
      data: { name: input.name, description: input.description ?? null, userId: user.id },
    });
    res.status(201).json(categoryPublic(category));
  })
);

router.get(
  "/",
  getCurrentUser,
  asyncHandler(async (req, res) => {
    const categories = await prisma.category.findMany({
      where: { userId: req.user.id },
      orderBy: { name: "asc" },
    });
    res.json(categories.map(categoryPublic));
  })
);

router.get(
  "/:categoryId",
  getCurrentUser,
  asyncHandler(async (req, res) => {
    const category = await prisma.category.findUnique({
      where: { id: Number.parseInt(req.params.categoryId, 10) },
    });
    if (!category || category.userId !== req.user.id) {
      throw new HttpError(404, "Category not found");
    }
    res.json(categoryPublic(category));
  })
);

router.patch(
  "/:categoryId",
  getCurrentUser,
  validateBody(categoryUpdate),
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.categoryId, 10);
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category || category.userId !== req.user.id) {
      throw new HttpError(404, "Category not found");
    }
    const input = req.validated;
    const data = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;

    const updated = await prisma.category.update({ where: { id }, data });
    res.json(categoryPublic(updated));
  })
);

router.delete(
  "/:categoryId",
  getCurrentUser,
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.categoryId, 10);
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category || category.userId !== req.user.id) {
      throw new HttpError(404, "Category not found");
    }
    await prisma.category.delete({ where: { id } });
    logger.info(`User ${req.user.username} deleted category ${id}`);
    res.status(204).end();
  })
);

module.exports = router;
