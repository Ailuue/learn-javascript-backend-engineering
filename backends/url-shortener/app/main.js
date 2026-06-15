// Express application factory — the JS analog of main.py. The redirect router is
// mounted last because its `/:shortCode` route would otherwise shadow /urls,
// /auth, and /health.

const express = require("express");

const cache = require("./cache");
const { errorHandler } = require("./errors");
const authRouter = require("./routers/auth");
const urlsRouter = require("./routers/urls");
const redirectRouter = require("./routers/redirect");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/health", async (req, res) => {
  res.json({ status: "ok", cache: await cache.stats() });
});

app.use("/auth", authRouter);
app.use("/urls", urlsRouter);
app.use("/", redirectRouter);

app.use(errorHandler);

module.exports = app;
