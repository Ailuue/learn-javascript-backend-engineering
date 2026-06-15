// Password hashing, JWT helpers, and the auth middleware — the JS analog of
// auth.py. Express middleware replace FastAPI's Depends(get_current_user).

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const prisma = require("./database");
const { getSettings } = require("./config");
const { HttpError, asyncHandler } = require("./errors");

function hashPassword(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync());
}

function verifyPassword(plain, hashed) {
  return bcrypt.compareSync(plain, hashed);
}

function createAccessToken(username) {
  const settings = getSettings();
  return jwt.sign({ sub: username }, settings.jwtSecret, {
    algorithm: settings.jwtAlgorithm,
    expiresIn: `${settings.jwtExpiryMinutes}m`,
  });
}

function bearerToken(req) {
  const header = req.get("authorization") || "";
  const [scheme, value] = header.split(" ");
  return scheme === "Bearer" && value ? value : null;
}

// Populates req.user with the active User row, or throws 401.
const getCurrentUser = asyncHandler(async (req, _res, next) => {
  const settings = getSettings();
  const credentialsError = new HttpError(401, "Invalid or expired token", {
    "WWW-Authenticate": "Bearer",
  });

  const token = bearerToken(req);
  if (!token) throw credentialsError;

  let payload;
  try {
    payload = jwt.verify(token, settings.jwtSecret, {
      algorithms: [settings.jwtAlgorithm],
    });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new HttpError(401, "Token has expired", { "WWW-Authenticate": "Bearer" });
    }
    throw credentialsError;
  }

  if (!payload.sub) throw credentialsError;

  const user = await prisma.user.findFirst({
    where: { username: payload.sub, isActive: true },
  });
  if (!user) throw credentialsError;

  req.user = user;
  next();
});

module.exports = {
  hashPassword,
  verifyPassword,
  createAccessToken,
  getCurrentUser,
};
