# JWT & RBAC

JSON Web Tokens for stateless authentication, and role-based access control on
top, using [`jsonwebtoken`](https://github.com/auth0/node-jsonwebtoken) + Express.

| File | What it teaches |
|---|---|
| `01_jwt_basics.js` | Anatomy of a JWT; sign/verify; tampered, expired, wrong-secret rejection |
| `02_auth_flow.js` | Login → token → `Authorization: Bearer`; auth middleware (FastAPI `Depends` equivalent) |
| `03_rbac.js` | `requireRole(min)` middleware factory; 401 vs 403 |
| `04_refresh_tokens.js` | Short access + long refresh tokens, rotation, server-side revocation |

## Run

```bash
npm install            # from the repo root (jsonwebtoken, express)
node 01_jwt_basics.js  # standalone demo
node 02_auth_flow.js   # starts an Express server on :8000
```

```bash
curl -sX POST localhost:8000/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"secret"}'
curl localhost:8000/me -H 'Authorization: Bearer <token>'
```

## PyJWT/FastAPI → jsonwebtoken/Express

| Python | JS |
|--------|-----|
| `jwt.encode(payload, secret, algorithm="HS256")` | `jwt.sign(payload, secret, { algorithm: "HS256", expiresIn })` |
| `jwt.decode(token, secret, algorithms=[...])` | `jwt.verify(token, secret)` |
| `ExpiredSignatureError` / `InvalidTokenError` | `err.name === "TokenExpiredError"` / `"JsonWebTokenError"` |
| `Depends(get_current_user)` | `authenticate` middleware setting `req.user` |
| `Depends(require_role("admin"))` | `requireRole("admin")` middleware factory |
