// Zod schemas for categories — the JS analog of schemas/category.py.

const { z } = require("zod");

const categoryCreate = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullish(),
});

const categoryUpdate = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullish(),
});

module.exports = { categoryCreate, categoryUpdate };
