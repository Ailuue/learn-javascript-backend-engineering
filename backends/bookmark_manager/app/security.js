// Password hashing and JWT helpers — the JS analog of security.py.

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { getSettings } = require("./config");

function hashPassword(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync());
}

function verifyPassword(plain, hashed) {
  return bcrypt.compareSync(plain, hashed);
}

function createAccessToken(subject, expiresMinutes = null) {
  const settings = getSettings();
  const minutes = expiresMinutes || settings.accessTokenExpireMinutes;
  return jwt.sign(
    { sub: subject, jti: crypto.randomUUID() },
    settings.secretKey,
    { algorithm: settings.algorithm, expiresIn: `${minutes}m` }
  );
}

// Returns { sub, jti, exp } on success or null on any failure — mirrors
// decode_access_token returning Optional[TokenPayload].
function decodeAccessToken(token) {
  const settings = getSettings();
  try {
    const payload = jwt.verify(token, settings.secretKey, {
      algorithms: [settings.algorithm],
    });
    if (!payload.sub || !payload.jti || !payload.exp) {
      return null;
    }
    return {
      sub: String(payload.sub),
      jti: String(payload.jti),
      exp: new Date(payload.exp * 1000),
    };
  } catch {
    return null;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  createAccessToken,
  decodeAccessToken,
};
