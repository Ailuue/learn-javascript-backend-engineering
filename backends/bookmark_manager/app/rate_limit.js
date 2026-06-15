// Rate limiting — the JS analog of rate_limit.py (slowapi). Each call returns a
// fresh express-rate-limit middleware. We set skipFailedRequests so that, like
// slowapi (whose limit check runs inside the handler, after request
// validation), requests rejected before the handler don't consume a slot.

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
