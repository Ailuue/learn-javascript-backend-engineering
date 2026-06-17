// Zod request schemas + response serializers. Input keys stay snake_case to
// match the JSON the API accepts/returns.

const { z } = require("zod");

const urlCreate = z.object({
  original_url: z
    .string()
    .refine((v) => v.startsWith("http://") || v.startsWith("https://"), {
      message: "URL must start with http:// or https://",
    }),
  custom_code: z
    .string()
    .nullish()
    .refine((v) => v == null || (/^[a-zA-Z0-9]+$/.test(v) && v.length >= 3 && v.length <= 10), {
      message: "Custom code must be 3–10 alphanumeric characters",
    }),
  expires_at: z.coerce.date().nullish(),
});

const registerRequest = z.object({
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8),
});

function urlResponse(url, baseUrl) {
  return {
    id: url.id,
    short_code: url.shortCode,
    original_url: url.originalUrl,
    short_url: `${baseUrl}/${url.shortCode}`,
    created_at: url.createdAt,
    expires_at: url.expiresAt,
    click_count: url.clickCount,
    is_active: url.isActive,
  };
}

function urlStats(url) {
  return {
    short_code: url.shortCode,
    original_url: url.originalUrl,
    click_count: url.clickCount,
    created_at: url.createdAt,
    expires_at: url.expiresAt,
    is_active: url.isActive,
  };
}

function tokenResponse(accessToken) {
  return { access_token: accessToken, token_type: "bearer" };
}

function userResponse(user) {
  return { id: user.id, username: user.username, created_at: user.createdAt };
}

module.exports = {
  urlCreate,
  registerRequest,
  urlResponse,
  urlStats,
  tokenResponse,
  userResponse,
};
