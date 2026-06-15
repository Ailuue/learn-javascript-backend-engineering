/**
 * 04_refresh_tokens.js — Access + Refresh Token Pattern
 * ======================================================
 * A short-lived access token limits damage if stolen, but you don't want users
 * logging in every 15 minutes. So issue two tokens at login:
 *
 *   Access token  (15 min) → every API request, stateless
 *   Refresh token (7 days) → only to mint a new access token, stored server-side
 *
 * When the access token expires, the client POSTs the refresh token to
 * /auth/refresh for a new pair. The old refresh token is invalidated immediately
 * (rotation): if it was stolen, the next use reveals the theft. Storing refresh
 * tokens server-side (here a Map keyed by `jti`) lets you revoke them on logout,
 * password change, or suspicious activity.
 *
 * Run:  node 04_refresh_tokens.js
 */

const crypto = require("crypto");
const express = require("express");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const SECRET = "dev-secret-key-minimum-32-bytes!!";
const ACCESS_TTL = "15m";
const REFRESH_TTL = "7d";

const USERS = {
  alice: { password: "secret", role: "admin" },
  bob: { password: "hunter2", role: "viewer" },
};

// Production: Redis / a DB table of (jti, username, expiresAt). A Map keeps the demo dependency-free.
const activeRefreshTokens = new Map(); // jti → username

const createAccessToken = (username, role) =>
  jwt.sign({ sub: username, role, type: "access" }, SECRET, { expiresIn: ACCESS_TTL });

function createRefreshToken(username) {
  const jti = crypto.randomUUID();
  activeRefreshTokens.set(jti, username);
  return jwt.sign({ sub: username, jti, type: "refresh" }, SECRET, { expiresIn: REFRESH_TTL });
}

function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) return res.status(401).json({ detail: "Missing bearer token" });
  let payload;
  try {
    payload = jwt.verify(token, SECRET);
  } catch (err) {
    const detail = err.name === "TokenExpiredError" ? "Access token expired" : "Invalid token";
    return res.status(401).json({ detail });
  }
  if (payload.type !== "access") return res.status(401).json({ detail: "Expected an access token" });
  req.user = payload;
  return next();
}

app.post("/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = USERS[username];
  if (!user || user.password !== password) return res.status(401).json({ detail: "Invalid credentials" });
  return res.json({
    access_token: createAccessToken(username, user.role),
    refresh_token: createRefreshToken(username),
    token_type: "bearer",
  });
});

app.post("/auth/refresh", (req, res) => {
  let payload;
  try {
    payload = jwt.verify(req.body.refresh_token, SECRET);
  } catch (err) {
    const detail = err.name === "TokenExpiredError" ? "Refresh token expired — please log in again" : "Invalid refresh token";
    return res.status(401).json({ detail });
  }
  if (payload.type !== "refresh") return res.status(401).json({ detail: "Expected a refresh token" });

  const username = activeRefreshTokens.get(payload.jti);
  if (!username) return res.status(401).json({ detail: "Refresh token has been revoked" });

  activeRefreshTokens.delete(payload.jti); // rotate: invalidate before reissuing
  const user = USERS[username];
  return res.json({
    access_token: createAccessToken(username, user.role),
    refresh_token: createRefreshToken(username),
    token_type: "bearer",
  });
});

app.post("/auth/logout", (req, res) => {
  try {
    const payload = jwt.verify(req.body.refresh_token, SECRET);
    activeRefreshTokens.delete(payload.jti);
  } catch {
    // already invalid — treat as a successful logout
  }
  res.json({ status: "logged out" });
});

app.get("/me", authenticate, (req, res) => {
  res.json({ username: req.user.sub, role: req.user.role });
});

if (require.main === module) {
  app.listen(8000, () => console.log("refresh-tokens on http://localhost:8000"));
}

module.exports = { app, activeRefreshTokens };
