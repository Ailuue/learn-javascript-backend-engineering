/**
 * OAuth2 → JWT Session Bridge
 * ==============================
 * OAuth2 tells you *who* the user is; it doesn't define how your app manages its
 * own sessions. The standard pattern: verify identity via OAuth2, find/create the
 * user in YOUR database, then issue YOUR OWN JWT — identical to a password login.
 *
 * Why bridge? The GitHub token is scoped to the GitHub API; you can't authenticate
 * requests to your API with it. After you mint your own JWT, GitHub is out of the
 * picture and every request uses your token like any other auth flow.
 *
 *   GET /login/github            redirect to GitHub
 *   GET /auth/github/callback    exchange code, upsert user, return a JWT
 *   GET /me, GET /protected      JWT-only (Authorization: Bearer <token>)
 *
 * Run:  node 03_session.js   (same GitHub OAuth app + .env as 02_github.js)
 */

const crypto = require("crypto");
const express = require("express");
const session = require("express-session");
const jwt = require("jsonwebtoken");

const app = express();
const SECRET_KEY = process.env.SECRET_KEY || "dev-secret";
app.use(session({ secret: SECRET_KEY, resave: false, saveUninitialized: true }));

const CLIENT_ID = process.env.GITHUB_CLIENT_ID || "your_client_id";
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "your_client_secret";
const REDIRECT_URI = "http://localhost:8000/auth/github/callback";
const TOKEN_TTL_SECONDS = 8 * 3600;

// Simulated user store, keyed by "github:{id}". Production: a real DB upsert.
const users = new Map();

function upsertUser(gh) {
  const key = `github:${gh.id}`;
  if (!users.has(key)) {
    users.set(key, { id: key, name: gh.name || gh.login, email: gh.email, avatar_url: gh.avatar_url, provider: "github" });
  }
  return users.get(key);
}

const createToken = (user) =>
  jwt.sign({ sub: user.id, name: user.name }, SECRET_KEY, { algorithm: "HS256", expiresIn: TOKEN_TTL_SECONDS });

// Reusable auth middleware (the FastAPI Depends(current_user) equivalent).
function currentUser(req, res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) return res.status(401).json({ detail: "Missing bearer token" });
  let payload;
  try {
    payload = jwt.verify(token, SECRET_KEY);
  } catch (err) {
    return res.status(401).json({ detail: err.name === "TokenExpiredError" ? "Token expired" : "Invalid token" });
  }
  const user = users.get(payload.sub);
  if (!user) return res.status(401).json({ detail: "User not found" });
  req.user = user;
  return next();
}

app.get("/login/github", (req, res) => {
  const state = crypto.randomBytes(16).toString("base64url");
  req.session.oauthState = state;
  const params = new URLSearchParams({ client_id: CLIENT_ID, redirect_uri: REDIRECT_URI, scope: "read:user user:email", state });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

app.get("/auth/github/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!state || state !== req.session.oauthState) return res.status(400).json({ detail: "state mismatch" });
  delete req.session.oauthState;

  const tokenResp = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code, redirect_uri: REDIRECT_URI }),
  });
  const { access_token: accessToken, error } = await tokenResp.json();
  if (error || !accessToken) return res.status(400).json({ detail: `OAuth error: ${error || "no token"}` });

  const gh = await (await fetch("https://api.github.com/user", { headers: { Authorization: `token ${accessToken}`, "User-Agent": "oauth-demo" } })).json();

  // 1. Resolve the GitHub identity to your own user record.
  const user = upsertUser(gh);
  // 2. Issue your own JWT — GitHub is now out of the picture.
  return res.json({
    access_token: createToken(user),
    token_type: "bearer",
    expires_in: TOKEN_TTL_SECONDS,
    user,
    note: "Pass this token as: Authorization: Bearer <token>",
  });
});

app.get("/me", currentUser, (req, res) => res.json(req.user));
app.get("/protected", currentUser, (req, res) => res.json({ message: `Hello ${req.user.name}, you have access.`, user_id: req.user.id }));

if (require.main === module) {
  app.listen(8000, () => console.log("OAuth2 → JWT bridge on http://localhost:8000"));
}

module.exports = { app, upsertUser, createToken };
