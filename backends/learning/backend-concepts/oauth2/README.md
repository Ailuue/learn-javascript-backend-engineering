# OAuth2

Sign users in with a third-party provider (GitHub) via the Authorization Code
flow, using Express + express-session + the built-in `fetch`.

| File | What it teaches |
|---|---|
| `01_concepts.js` | The flow mechanics: auth URL, `state` CSRF check, code→token exchange (printed, not run) |
| `02_github.js` | Full GitHub login: session-stored state, token exchange, profile fetch, session cookie |
| `03_session.js` | Bridge an OAuth identity to your own JWT — from then on, GitHub is out of the picture |

`01_concepts.js` runs with no setup. For `02`/`03`, create a GitHub OAuth app
(callback `http://localhost:8000/auth/github/callback`) and supply
`GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` / `SECRET_KEY` (see `.env.example`).

## Run

```bash
npm install                 # from the repo root (express, express-session, jsonwebtoken)
node 01_concepts.js         # standalone explainer
node 02_github.js           # open http://localhost:8000
```

## Authlib → Express

| Python (Authlib) | JS |
|------------------|-----|
| `oauth.register(...)` | manual config + `fetch` token exchange |
| `authorize_redirect` (stores state) | `crypto.randomBytes` state in `req.session` + redirect |
| `authorize_access_token` (verifies state) | compare `req.query.state` to session, then `fetch` |
| `SessionMiddleware` | `express-session` |
| `request.session["user"]` | `req.session.user` |
