// Request-body validation middleware — feeds the body through a Zod schema and
// returns 422 with the issues on failure.

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
