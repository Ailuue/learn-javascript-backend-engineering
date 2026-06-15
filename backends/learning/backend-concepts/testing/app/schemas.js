// Request schemas with Zod — the JS analog of FastAPI's Pydantic models.
// The route layer parses the body with these; a failure becomes a 422.

const { z } = require("zod");

const PostCreate = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
});

const PostUpdate = z.object({
  // .nullish() accepts the field being absent OR explicitly null (the route
  // only applies non-null values, so null is a no-op — like Pydantic optional).
  title: z.string().min(1).max(200).nullish(),
  body: z.string().nullish(),
  published: z.boolean().nullish(),
});

module.exports = { PostCreate, PostUpdate };
