// Auth middleware — the JS analog of dependencies.py. Express middleware replace
// FastAPI's Depends(): `getCurrentToken` validates the bearer token (and checks
// the Redis blocklist), `getCurrentUser` additionally loads the User row.

const prisma = require("./database");
const { HttpError, asyncHandler } = require("./exceptions");
const { getRedis } = require("./redis_client");
const { decodeAccessToken } = require("./security");

const BLOCKLIST_KEY_PREFIX = "blocklist:";

function blocklistKey(jti) {
  return `${BLOCKLIST_KEY_PREFIX}${jti}`;
}

function bearerToken(req) {
  const header = req.get("authorization") || "";
  const [scheme, value] = header.split(" ");
  return scheme === "Bearer" && value ? value : null;
}

const credentialsError = () =>
  new HttpError(401, "Could not validate credentials", {
    "WWW-Authenticate": "Bearer",
  });

// Populates req.tokenPayload with { sub, jti, exp }.
const getCurrentToken = asyncHandler(async (req, _res, next) => {
  const token = bearerToken(req);
  const payload = token ? decodeAccessToken(token) : null;
  if (!payload) throw credentialsError();
  if (await getRedis().exists(blocklistKey(payload.jti))) throw credentialsError();
  req.tokenPayload = payload;
  next();
});

// Populates req.user with the active User row. Chains after getCurrentToken.
const getCurrentUser = [
  getCurrentToken,
  asyncHandler(async (req, _res, next) => {
    const user = await prisma.user.findUnique({
      where: { username: req.tokenPayload.sub },
    });
    if (!user) throw credentialsError();
    if (!user.isActive) throw new HttpError(400, "Inactive user");
    req.user = user;
    next();
  }),
];

module.exports = { getCurrentToken, getCurrentUser, blocklistKey };
