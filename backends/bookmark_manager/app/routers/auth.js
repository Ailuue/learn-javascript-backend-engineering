// Auth routes

const express = require("express");

const prisma = require("../database");
const { getCurrentToken, getCurrentUser, blocklistKey } = require("../dependencies");
const { HttpError, asyncHandler } = require("../exceptions");
const { limit } = require("../rate_limit");
const { getRedis } = require("../redis_client");
const { makeLogger } = require("../logging_config");
const { validateBody } = require("../validate");
const { userCreate } = require("../schemas/user");
const { userPublic, tokenResponse } = require("../schemas/serializers");
const {
  createAccessToken,
  hashPassword,
  verifyPassword,
} = require("../security");

const router = express.Router();
const logger = makeLogger("app.routers.auth");

router.post(
  "/register",
  limit(5),
  validateBody(userCreate),
  asyncHandler(async (req, res) => {
    const { email, username, password } = req.validated;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      throw new HttpError(400, "A user with that email or username already exists");
    }

    const user = await prisma.user.create({
      data: { email, username, passwordHash: hashPassword(password) },
    });
    logger.info(`Registered new user: ${user.username}`);
    res.status(201).json(userPublic(user));
  })
);

// OAuth2 password flow: the token endpoint reads form-encoded username/password.
router.post(
  "/token",
  limit(10),
  asyncHandler(async (req, res) => {
    const { username, password } = req.body || {};
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !verifyPassword(password || "", user.passwordHash)) {
      logger.warning(`Failed login attempt for username: ${username}`);
      throw new HttpError(401, "Incorrect username or password", {
        "WWW-Authenticate": "Bearer",
      });
    }
    if (!user.isActive) {
      throw new HttpError(400, "Inactive user");
    }

    const token = createAccessToken(user.username);
    logger.info(`Issued token for user: ${user.username}`);
    res.json(tokenResponse(token));
  })
);

// Revoke the caller's token by adding its jti to the Redis blocklist.
router.post(
  "/logout",
  getCurrentToken,
  asyncHandler(async (req, res) => {
    const payload = req.tokenPayload;
    const remaining = Math.floor((payload.exp.getTime() - Date.now()) / 1000);
    if (remaining > 0) {
      await getRedis().setex(blocklistKey(payload.jti), remaining, "1");
    }
    logger.info(`User ${payload.sub} logged out (jti=${payload.jti})`);
    res.status(204).end();
  })
);

router.get(
  "/me",
  getCurrentUser,
  asyncHandler(async (req, res) => {
    res.json(userPublic(req.user));
  })
);

module.exports = router;
