// Zod schemas for bookmarks

const { z } = require("zod");

const httpUrl = z
  .string()
  .url()
  .refine((v) => v.startsWith("http://") || v.startsWith("https://"), {
    message: "URL must be http or https",
  });

const bookmarkCreate = z.object({
  url: httpUrl,
  title: z.string().max(300).nullish(),
  description: z.string().max(1000).nullish(),
  favorite: z.boolean().default(false),
  category_id: z.number().int().nullish(),
  tags: z.array(z.string()).max(20).default([]),
});

const bookmarkUpdate = z.object({
  url: httpUrl.optional(),
  title: z.string().max(300).nullish(),
  description: z.string().max(1000).nullish(),
  favorite: z.boolean().optional(),
  category_id: z.number().int().nullish(),
  tags: z.array(z.string()).max(20).nullish(),
});

module.exports = { bookmarkCreate, bookmarkUpdate };
