// HTTP error type + centralized error handling. Provides an HttpError class and
// an async wrapper so thrown/rejected errors reach the error middleware.

class HttpError extends Error {
  constructor(statusCode, detail, headers = null) {
    super(detail);
    this.statusCode = statusCode;
    this.detail = detail;
    this.headers = headers;
  }
}

// Wrap an async handler so rejected promises reach the error middleware.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Express error middleware — register last. Maps HttpError and Prisma
// unique-constraint violations (P2002); everything else is a 500.
function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    if (err.headers) res.set(err.headers);
    return res.status(err.statusCode).json({ detail: err.detail });
  }
  if (err && err.code === "P2002") {
    return res.status(409).json({ detail: "Resource already exists" });
  }
  return res.status(500).json({ detail: "Internal server error" });
}

module.exports = { HttpError, asyncHandler, errorHandler };
