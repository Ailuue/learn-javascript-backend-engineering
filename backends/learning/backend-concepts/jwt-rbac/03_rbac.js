/**
 * 03_rbac.js — Role-Based Access Control
 * ========================================
 * Authentication = "who are you?"; authorization = "what may you do?".
 * RBAC assigns users to roles, and each route requires a minimum role. Because
 * the role is a JWT claim, the server needs no DB lookup to enforce it.
 *
 *   viewer (0) → read    editor (1) → read+write    admin (2) → read+write+delete
 *
 * The key idea is a *middleware factory*: `requireRole("admin")` returns an
 * Express middleware that rejects anyone below that level — the analog of
 * FastAPI's `require_role` dependency factory.
 *
 *   401 → no/invalid/expired token    403 → valid token, role too low
 *
 * Run:  node 03_rbac.js
 */

const express = require("express");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const SECRET = "dev-secret-key-minimum-32-bytes!!";

const USERS = {
  alice: { password: "secret", role: "admin" },
  bob: { password: "hunter2", role: "editor" },
  carol: { password: "pass", role: "viewer" },
};

const ROLE_LEVEL = { viewer: 0, editor: 1, admin: 2 };

const createToken = (username, role) => jwt.sign({ sub: username, role }, SECRET, { expiresIn: "1h" });

function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) return res.status(401).json({ detail: "Missing bearer token" });
  try {
    req.user = jwt.verify(token, SECRET);
    return next();
  } catch (err) {
    const detail = err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
    return res.status(401).json({ detail });
  }
}

// Middleware factory enforcing a minimum role level.
function requireRole(minimum) {
  return (req, res, next) => {
    const userLevel = ROLE_LEVEL[req.user.role] ?? -1;
    if (userLevel < ROLE_LEVEL[minimum]) {
      return res.status(403).json({
        detail: `Requires '${minimum}' role or above. You have '${req.user.role}'.`,
      });
    }
    return next();
  };
}

app.post("/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = USERS[username];
  if (!user || user.password !== password) return res.status(401).json({ detail: "Invalid credentials" });
  return res.json({ access_token: createToken(username, user.role), token_type: "bearer" });
});

app.get("/articles", authenticate, requireRole("viewer"), (req, res) => {
  res.json({ articles: ["Article 1", "Article 2"], read_by: req.user.sub });
});

app.post("/articles", authenticate, requireRole("editor"), (req, res) => {
  res.json({ created: true, by: req.user.sub });
});

app.delete("/articles/:id", authenticate, requireRole("admin"), (req, res) => {
  res.json({ deleted: Number(req.params.id), by: req.user.sub });
});

if (require.main === module) {
  app.listen(8000, () => console.log("rbac on http://localhost:8000"));
}

module.exports = { app, requireRole };
