// Express application factory. Builds and exports the configured app (CORS, body
// parsing, routers, health, error handling). The network listen happens in
// server.js, keeping the app importable for tests.

const express = require("express");
const cors = require("cors");

const { getSettings } = require("./config");
const { errorHandler } = require("./exceptions");
const authRouter = require("./routers/auth");
const bookmarksRouter = require("./routers/bookmarks");
const categoriesRouter = require("./routers/categories");
const tagsRouter = require("./routers/tags");

const settings = getSettings();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "http://127.0.0.1:5175",
    ],
    credentials: true,
  })
);

app.use("/auth", authRouter);
app.use("/bookmarks", bookmarksRouter);
app.use("/tags", tagsRouter);
app.use("/categories", categoriesRouter);

app.get("/health", (req, res) => {
  res.json({ status: "ok", environment: settings.environment });
});

app.use(errorHandler);

module.exports = app;
