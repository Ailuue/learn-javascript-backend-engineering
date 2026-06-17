/*
 * Web framework tutorial — Express (the 2026 JS way)
 * ==================================================
 * A single growing server that adds one HTTP concept at a time: routing, request
 * validation with Zod, file uploads, error handling, and a small DB layer.
 * Here we use better-sqlite3 for a zero-setup DB.
 *
 * Run:  node tutorial/server.js   →  http://localhost:8000
 */

const express = require("express");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const { z } = require("zod");
const Database = require("better-sqlite3");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // form bodies
app.use(cookieParser());
// CORS for a local frontend.
app.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", "http://localhost:5173");
  res.set("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  return next();
});

const upload = multer({ storage: multer.memoryStorage() });

// ── Zod schemas (request validation) ───────────────────────────────────────
const Image = z.object({ url: z.string().url(), name: z.string() });
const Item = z.object({
  name: z.string(),
  description: z.string().nullish(),
  price: z.number(),
  tax: z.number().nullish(),
  images: z.array(Image).nullish(),
});
// Validate a body against a schema, returning 422 on failure.
const validate = (schema) => (req, res, next) => {
  const r = schema.safeParse(req.body);
  if (!r.success) return res.status(422).json({ detail: r.error.issues });
  req.data = r.data;
  return next();
};

const MODEL_NAMES = ["alexnet", "resnet", "lenet"];
const fakeItemsDb = [{ item_name: "Foo" }, { item_name: "Bar" }, { item_name: "Baz" }];

// ── Root: a tiny upload form (HTML response) ────────────────────────────────
app.get("/", (_req, res) => {
  res.type("html").send(`<body>
<form action="/files/uploadfile/" enctype="multipart/form-data" method="post">
  <input name="file" type="file"><input type="submit">
</form></body>`);
});

// ── Path + query parameters ─────────────────────────────────────────────────
app.get("/items/:item_id", (req, res) => {
  const { item_id: itemId } = req.params;
  const { q, short } = req.query;
  if (q) return res.json({ item_id: itemId, q });
  return res.json({ item_id: itemId, short: short === "true" });
});

// Enum-style path param (fixed set of allowed values).
app.get("/models/:model_name", (req, res) => {
  if (!MODEL_NAMES.includes(req.params.model_name)) {
    return res.status(422).json({ detail: `model_name must be one of ${MODEL_NAMES.join(", ")}` });
  }
  return res.json({ model_name: req.params.model_name });
});

// Query params with defaults (skip/limit pagination).
app.get("/items/", (req, res) => {
  const skip = Number(req.query.skip ?? 0);
  const limit = Number(req.query.limit ?? 10);
  res.json(fakeItemsDb.slice(skip, skip + limit));
});

// ── Request body (Zod-validated) ────────────────────────────────────────────
app.post("/items/", validate(Item), (req, res) => {
  const item = req.data;
  const out = { ...item };
  if (item.tax) out.total_price = item.price + item.tax;
  res.json(out);
});

app.put("/items/:item_id", validate(Item), (req, res) => {
  const result = { item_id: Number(req.params.item_id), ...req.data };
  if (req.query.q) result.q = req.query.q;
  res.json(result);
});

// ── Query validation (min/max length, pattern) ──────────────────────────────
app.get("/items/limited/", (req, res) => {
  const schema = z.object({
    q: z.string().min(3).max(50).regex(/^[a-zA-Z]+$/).optional(),
    "q-list": z.union([z.string(), z.array(z.string())]).optional(),
  });
  const r = schema.safeParse(req.query);
  if (!r.success) return res.status(422).json({ detail: r.error.issues });
  const results = { items: [{ item_id: "Foo" }, { item_id: "Bar" }] };
  if (r.data.q) results.q = r.data.q;
  if (r.data["q-list"]) results.q_list = [].concat(r.data["q-list"]);
  return res.json(results);
});

// ── Path param numeric validation (ge/le) ───────────────────────────────────
app.get("/items/validated/:item_id", (req, res) => {
  const itemId = Number(req.params.item_id);
  if (!Number.isInteger(itemId) || itemId < 1 || itemId > 1000) {
    return res.status(422).json({ detail: "item_id must be an integer in [1, 1000]" });
  }
  const results = { item_id: itemId };
  if (req.query["item-query"]) results.q = req.query["item-query"];
  return res.json(results);
});

// ── Cookies & headers ───────────────────────────────────────────────────────
app.get("/cookies/", (req, res) => res.json({ ads_id: req.cookies.ads_id ?? null }));
app.get("/headers/", (req, res) =>
  res.json({ "User-Agent": req.headers["user-agent"] ?? null, "x-token": req.headers["x-token"] ?? null })
);

// ── File uploads (multer) ───────────────────────────────────────────────────
app.post("/files/upload", upload.single("file"), (req, res) => res.json({ file_size: req.file?.buffer.length ?? 0 }));
app.post("/files/uploadfile/", upload.single("file"), (req, res) =>
  res.json({ filename: req.file?.originalname, content_type: req.file?.mimetype })
);
// Form field + file together.
app.post("/files/form-and-file", upload.single("fileb"), (req, res) =>
  res.json({ token: req.body.token, fileb_content_type: req.file?.mimetype })
);

// ── Error handling (status codes + a custom exception) ──────────────────────
app.get("/errors/not-found/:item_id", (req, res) =>
  res.status(404).json({ detail: `Item with id ${req.params.item_id} not found` })
);
// Custom exception → 418, handled by the error middleware below.
class CustomException extends Error {
  constructor(value) {
    super("custom");
    this.value = value;
  }
}
app.get("/errors/bad-request", (req, res) => {
  throw new CustomException(Number(req.query.value));
});

// ── SQLite CRUD (better-sqlite3) ────────────────────────────────────────────
const db = new Database(`${__dirname}/database.db`);
db.exec("CREATE TABLE IF NOT EXISTS hero (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, secret_name TEXT NOT NULL, age INTEGER)");
const HeroIn = z.object({ name: z.string(), secret_name: z.string(), age: z.number().int().nullish() });

app.post("/heroes/", validate(HeroIn), (req, res) => {
  const { name, secret_name: secretName, age = null } = req.data;
  const info = db.prepare("INSERT INTO hero (name, secret_name, age) VALUES (?, ?, ?)").run(name, secretName, age);
  res.json(db.prepare("SELECT * FROM hero WHERE id = ?").get(info.lastInsertRowid));
});
app.get("/heroes/", (req, res) => {
  const offset = Number(req.query.offset ?? 0);
  const limit = Math.min(100, Number(req.query.limit ?? 100));
  res.json(db.prepare("SELECT * FROM hero ORDER BY id LIMIT ? OFFSET ?").all(limit, offset));
});
app.get("/heroes/:hero_id", (req, res) => {
  const hero = db.prepare("SELECT * FROM hero WHERE id = ?").get(Number(req.params.hero_id));
  if (!hero) return res.status(404).json({ detail: "Hero not found" });
  return res.json(hero);
});
app.patch("/heroes/:hero_id", (req, res) => {
  const hero = db.prepare("SELECT * FROM hero WHERE id = ?").get(Number(req.params.hero_id));
  if (!hero) return res.status(404).json({ detail: "Hero not found" });
  // Partial update: merge only the fields present in the request body.
  const merged = { ...hero, ...req.body };
  db.prepare("UPDATE hero SET name = ?, secret_name = ?, age = ? WHERE id = ?").run(merged.name, merged.secret_name, merged.age ?? null, hero.id);
  return res.json(db.prepare("SELECT * FROM hero WHERE id = ?").get(hero.id));
});
app.delete("/heroes/:hero_id", (req, res) => {
  const info = db.prepare("DELETE FROM hero WHERE id = ?").run(Number(req.params.hero_id));
  if (info.changes === 0) return res.status(404).json({ detail: "Hero not found" });
  return res.json({ ok: true });
});

// Error-handling middleware — catches the CustomException.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof CustomException) {
    return res.status(418).json({ message: `Oops! ${err.value} did something. There goes a rainbow...` });
  }
  return res.status(500).json({ detail: err.message });
});

if (require.main === module) {
  app.listen(8000, () => console.log("tutorial app on http://localhost:8000"));
}

module.exports = { app };
