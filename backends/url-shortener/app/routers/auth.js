// Auth routes — the JS analog of routers/auth.py.

const express = require("express");

const prisma = require("../database");
const {
  createAccessToken,
  getCurrentUser,
  hashPassword,
  verifyPassword,
} = require("../auth");
const { HttpError, asyncHandler } = require("../errors");
const { validateBody } = require("../validate");
const {
  registerRequest,
  tokenResponse,
  userResponse,
} = require("../schemas");

const router = express.Router();

router.post(
  "/register",
  validateBody(registerRequest),
  asyncHandler(async (req, res) => {
    const { username, password } = req.validated;
    try {
      await prisma.user.create({
        data: { username, hashedPassword: hashPassword(password) },
      });
    } catch (err) {
      if (err.code === "P2002") {
        throw new HttpError(409, "Username already taken");
      }
      throw err;
    }
    res.status(201).json(tokenResponse(createAccessToken(username)));
  })
);

// OAuth2 password flow: reads form-encoded username/password.
router.post(
  "/token",
  asyncHandler(async (req, res) => {
    const { username, password } = req.body || {};
    const user = await prisma.user.findFirst({
      where: { username, isActive: true },
    });
    if (!user || !verifyPassword(password || "", user.hashedPassword)) {
      throw new HttpError(401, "Incorrect username or password", {
        "WWW-Authenticate": "Bearer",
      });
    }
    res.json(tokenResponse(createAccessToken(user.username)));
  })
);

router.get(
  "/me",
  getCurrentUser,
  asyncHandler(async (req, res) => {
    res.json(userResponse(req.user));
  })
);

module.exports = router;
