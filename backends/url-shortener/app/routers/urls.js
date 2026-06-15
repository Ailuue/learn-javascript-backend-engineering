// URL management routes — the JS analog of routers/urls.py.

const express = require("express");

const prisma = require("../database");
const cache = require("../cache");
const { getCurrentUser } = require("../auth");
const { getSettings } = require("../config");
const { HttpError, asyncHandler } = require("../errors");
const { validateBody } = require("../validate");
const { urlCreate, urlResponse, urlStats } = require("../schemas");
const { generateShortCode } = require("../shortener");

const router = express.Router();

const MAX_RETRIES = 5;

router.post(
  "/",
  getCurrentUser,
  validateBody(urlCreate),
  asyncHandler(async (req, res) => {
    const input = req.validated;
    const baseUrl = getSettings().baseUrl;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
      const shortCode = input.custom_code || generateShortCode();
      try {
        const url = await prisma.url.create({
          data: {
            shortCode,
            originalUrl: input.original_url,
            expiresAt: input.expires_at ?? null,
          },
        });
        return res.status(201).json(urlResponse(url, baseUrl));
      } catch (err) {
        if (err.code !== "P2002") throw err;
        // short_code collision — retry with a fresh code unless it was custom.
        if (input.custom_code) {
          throw new HttpError(409, "Custom code already taken");
        }
      }
    }
    throw new HttpError(500, "Failed to generate a unique short code");
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Math.max(Number.parseInt(req.query.page ?? "1", 10), 1);
    const pageSize = Math.min(Math.max(Number.parseInt(req.query.page_size ?? "20", 10), 1), 100);
    const offset = (page - 1) * pageSize;
    const baseUrl = getSettings().baseUrl;

    const [total, rows] = await Promise.all([
      prisma.url.count(),
      prisma.url.findMany({
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: pageSize,
      }),
    ]);

    res.json({
      items: rows.map((u) => urlResponse(u, baseUrl)),
      total,
      page,
      page_size: pageSize,
    });
  })
);

router.get(
  "/:shortCode/stats",
  asyncHandler(async (req, res) => {
    const url = await prisma.url.findUnique({ where: { shortCode: req.params.shortCode } });
    if (!url) throw new HttpError(404, "Short URL not found");
    res.json(urlStats(url));
  })
);

router.delete(
  "/:shortCode",
  getCurrentUser,
  asyncHandler(async (req, res) => {
    const url = await prisma.url.findUnique({ where: { shortCode: req.params.shortCode } });
    if (!url) throw new HttpError(404, "Short URL not found");
    await prisma.url.update({ where: { id: url.id }, data: { isActive: false } });
    await cache.invalidate(req.params.shortCode);
    res.status(204).end();
  })
);

module.exports = router;
