// HTTP error type + centralized error handling — the JS analog of exceptions.py
// plus FastAPI's HTTPException.

const { makeLogger } = require("./logging_config");

const logger = makeLogger("app.exceptions");

// Raised inside handlers to short-circuit with a status code and detail, the way
// FastAPI's HTTPException does. `headers` lets auth routes set WWW-Authenticate.
class HttpError extends Error {
  constructor(statusCode, detail, headers = null) {
    super(detail);
    this.statusCode = statusCode;
    this.detail = detail;
    this.headers = headers;
  }
}

// Wrap an async handler so thrown errors reach the error middleware (Express 4
// doesn't forward rejected promises automatically).
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Express error middleware — must be registered last. Maps HttpError, Prisma
// unique-constraint violations (P2002 ≈ SQLAlchemy IntegrityError), and
// everything else (500), mirroring register_exception_handlers.
function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    if (err.headers) res.set(err.headers);
    return res.status(err.statusCode).json({ detail: err.detail });
  }

  if (err && err.code === "P2002") {
    logger.warning(`DB integrity error on ${req.path}: ${err.message}`);
    return res.status(409).json({
      detail: "Database integrity error (likely a uniqueness conflict)",
    });
  }

  logger.error(`Unhandled exception on ${req.path}: ${err && err.stack ? err.stack : err}`);
  return res.status(500).json({ detail: "Internal server error" });
}

module.exports = { HttpError, asyncHandler, errorHandler };
