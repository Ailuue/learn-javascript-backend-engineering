// Rate limiting. Each call returns a fresh express-rate-limit middleware. We set
// skipFailedRequests so that requests rejected before the handler (e.g. failed
// validation) don't consume a slot.

const rateLimit = require("express-rate-limit");

function limit(maxPerMinute) {
  return rateLimit({
    windowMs: 60 * 1000,
    max: maxPerMinute,
    skipFailedRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: { detail: "Rate limit exceeded" },
  });
}

module.exports = { limit };
