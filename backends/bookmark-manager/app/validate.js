// Request-body validation middleware. Runs the body through a Zod schema; on
// failure it returns 422 with the Zod issues.

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
