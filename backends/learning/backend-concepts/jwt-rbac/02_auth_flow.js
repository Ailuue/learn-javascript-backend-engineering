/**
 * 02_auth_flow.js — Login and Protected Routes
 * =============================================
 * The standard JWT auth flow:
 *   1. POST /auth/login — validate credentials, mint a signed JWT, return it.
 *   2. Client stores the token and sends it as `Authorization: Bearer <token>`.
 *   3. Protected routes verify the signature + expiry and trust the claims —
 *      no DB lookup per request. That's what makes JWTs "stateless".
 *
 *   401 Unauthorized → missing / expired / invalid token
 *   403 Forbidden    → valid token but not allowed (see 03_rbac.js)
 *
 * Express equivalent of FastAPI's Depends(get_current_user): a middleware that
 * verifies the Bearer token and attaches `req.user`.
 *
 * Run:  node 02_auth_flow.js
 * Test: curl -sX POST localhost:8000/auth/login -H 'Content-Type: application/json' \
 *         -d '{"username":"alice","password":"secret"}'
 *       curl localhost:8000/me -H 'Authorization: Bearer <token>'
 */

const express = require("express");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const SECRET = "dev-secret-key-minimum-32-bytes!!"; // use crypto.randomBytes in prod
const TOKEN_TTL = "1h";

// In a real app this is a DB with hashed passwords (bcrypt/argon2).
const USERS = {
  alice: { password: "secret", role: "admin" },
  bob: { password: "hunter2", role: "viewer" },
};

const createToken = (username, role) => jwt.sign({ sub: username, role }, SECRET, { expiresIn: TOKEN_TTL });

// Middleware: extract + verify the Bearer token, attach req.user.
function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ detail: "Missing bearer token" });
  }
  try {
    req.user = jwt.verify(token, SECRET);
    return next();
  } catch (err) {
    const detail = err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
    return res.status(401).json({ detail });
  }
}

app.post("/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = USERS[username];
  if (!user || user.password !== password) {
    return res.status(401).json({ detail: "Invalid credentials" });
  }
  return res.json({ access_token: createToken(username, user.role), token_type: "bearer" });
});

app.get("/me", authenticate, (req, res) => {
  res.json({ username: req.user.sub, role: req.user.role });
});

if (require.main === module) {
  app.listen(8000, () => console.log("auth-flow on http://localhost:8000"));
}

module.exports = { app, authenticate, createToken };
