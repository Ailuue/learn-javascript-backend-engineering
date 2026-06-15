// Zod schema for tags — the JS analog of schemas/tag.py.

const { z } = require("zod");

const tagCreate = z.object({
  name: z.string().min(1).max(50),
});

module.exports = { tagCreate };
