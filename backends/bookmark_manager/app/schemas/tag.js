// Zod schema for tags

const { z } = require("zod");

const tagCreate = z.object({
  name: z.string().min(1).max(50),
});

module.exports = { tagCreate };
