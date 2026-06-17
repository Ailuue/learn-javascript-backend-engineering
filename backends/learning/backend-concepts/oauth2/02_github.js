/**
 * GitHub OAuth2 Login with Express
 * =================================
 * The full Authorization Code flow from 01_concepts.js, implemented with
 * express-session for state + the built-in `fetch` for the token exchange.
 * (Doing it by hand here keeps the moving parts visible. For production,
 * `openid-client` or `passport-github2` handle the boilerplate.)
 *
 * Endpoints:
 *   GET /                       login page
 *   GET /login/github           redirect to GitHub's consent screen
 *   GET /auth/github/callback   GitHub redirects back here
 *   GET /me, GET /logout
 *
 * Setup: create a GitHub OAuth app (callback http://localhost:8000/auth/github/callback),
 * put the credentials in .env (see .env.example), and load them however you like.
 *
 * Run:  node 02_github.js  →  open http://localhost:8000
 */

const crypto = require("crypto");
const express = require("express");
const session = require("express-session");

const app = express();
app.use(session({ secret: process.env.SECRET_KEY || "dev-secret", resave: false, saveUninitialized: true }));

const CLIENT_ID = process.env.GITHUB_CLIENT_ID || "your_client_id";
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "your_client_secret";
const REDIRECT_URI = "http://localhost:8000/auth/github/callback";

app.get("/", (req, res) => {
  const user = req.session.user;
  if (user) {
    return res.send(`
      <h2>Logged in as ${user.name} (@${user.login})</h2>
      <img src="${user.avatar_url}" width="80" style="border-radius:50%">
      <p><a href="/logout">Log out</a></p>`);
  }
  return res.send(`
    <h2>GitHub OAuth2 Demo</h2>
    <a href="/login/github" style="display:inline-block;padding:10px 20px;background:#24292e;color:#fff;border-radius:6px;text-decoration:none;font-family:sans-serif">Login with GitHub</a>`);
});

app.get("/login/github", (req, res) => {
  // Generate + store the state for CSRF protection, then redirect.
  const state = crypto.randomBytes(16).toString("base64url");
  req.session.oauthState = state;
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: "read:user user:email",
    state,
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

app.get("/auth/github/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!state || state !== req.session.oauthState) {
    return res.status(400).send("<h3>OAuth error: state mismatch</h3><a href='/'>Try again</a>");
  }
  delete req.session.oauthState;

  // Exchange the code for an access token (server-to-server).
  const tokenResp = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code, redirect_uri: REDIRECT_URI }),
  });
  const { access_token: accessToken, error } = await tokenResp.json();
  if (error || !accessToken) {
    return res.status(400).send(`<h3>OAuth error: ${error || "no token"}</h3><a href='/'>Try again</a>`);
  }

  // Fetch the user's profile with the token.
  const userResp = await fetch("https://api.github.com/user", {
    headers: { Authorization: `token ${accessToken}`, "User-Agent": "oauth-demo" },
  });
  const gh = await userResp.json();

  // Store a minimal profile in the session — NOT the access token.
  req.session.user = {
    id: gh.id,
    login: gh.login,
    name: gh.name || gh.login,
    email: gh.email,
    avatar_url: gh.avatar_url,
  };
  return res.redirect("/");
});

app.get("/me", (req, res) => (req.session.user ? res.json(req.session.user) : res.redirect("/")));
app.get("/logout", (req, res) => req.session.destroy(() => res.redirect("/")));

if (require.main === module) {
  app.listen(8000, () => console.log("GitHub OAuth demo on http://localhost:8000"));
}

module.exports = { app };
