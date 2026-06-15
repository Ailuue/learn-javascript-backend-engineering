// Request-body validation middleware — the JS analog of FastAPI feeding the
// request body through a Pydantic model. On failure it returns 422 with the
// Zod issues, matching FastAPI's RequestValidationError handler.

function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      return res.status(422).json({ detail: result.error.issues });
    }
    req.validated = result.data;
    next();
  };
}

module.exports = { validateBody };
