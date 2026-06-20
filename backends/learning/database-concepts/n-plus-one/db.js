// Postgres helper + query counter for the N+1 demos.
//
// ORMs (Prisma, Drizzle) hide query counts behind lazy-loaded relations, which
// is how N+1 sneaks in. Here we use raw `pg` and a counting wrapper so every
// round-trip is explicit — exactly the thing N+1 makes easy to lose track of.

const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "n_plus_one_demo",
  user: process.env.DB_USER || process.env.USER || "postgres",
  password: process.env.DB_PASSWORD || "",
});

let log = null; // when set, every query is recorded here

async function query(sql, params = []) {
  if (log) log.push(sql.replace(/\s+/g, " ").trim());
  return pool.query(sql, params);
}

// Count + report every query fired inside fn (the query_log context manager).
async function withQueryLog(fn, { showSql = false } = {}) {
  log = [];
  try {
    await fn();
  } finally {
    const queries = log;
    log = null;
    console.log(`  → ${queries.length} quer${queries.length === 1 ? "y" : "ies"} fired`);
    if (showSql) queries.forEach((q, i) => console.log(`     [${i + 1}] ${q.slice(0, 200)}`));
    console.log();
    return queries; // eslint-disable-line no-unsafe-finally
  }
}

const close = () => pool.end();

async function setup() {
  await pool.query(`
    DROP TABLE IF EXISTS book_tags;
    DROP TABLE IF EXISTS books;
    DROP TABLE IF EXISTS tags;
    DROP TABLE IF EXISTS authors;
    CREATE TABLE authors (id SERIAL PRIMARY KEY, name TEXT NOT NULL, birth_year INT NOT NULL);
    CREATE TABLE books (id SERIAL PRIMARY KEY, title TEXT NOT NULL,
      author_id INT NOT NULL REFERENCES authors(id), genre TEXT NOT NULL);
    CREATE TABLE tags (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE);
    CREATE TABLE book_tags (book_id INT REFERENCES books(id), tag_id INT REFERENCES tags(id), PRIMARY KEY (book_id, tag_id));
  `);

  const tagNames = ["classic", "dystopian", "sci-fi", "literary", "short-stories", "philosophy", "adventure", "romance"];
  const tagId = {};
  for (const name of tagNames) {
    tagId[name] = (await pool.query("INSERT INTO tags (name) VALUES ($1) RETURNING id", [name])).rows[0].id;
  }

  const data = [
    ["George Orwell", 1903, [["Nineteen Eighty-Four", "dystopian", ["dystopian", "classic", "literary"]], ["Animal Farm", "fable", ["classic", "literary"]], ["Homage to Catalonia", "non-fiction", ["literary"]], ["Keep the Aspidistra", "literary", ["literary"]]]],
    ["Ursula K. Le Guin", 1929, [["The Left Hand of Darkness", "sci-fi", ["sci-fi", "classic"]], ["The Dispossessed", "sci-fi", ["sci-fi", "philosophy"]], ["A Wizard of Earthsea", "fantasy", ["adventure"]], ["The Ones Who Walk Away", "sci-fi", ["short-stories", "philosophy"]]]],
    ["Franz Kafka", 1883, [["The Trial", "literary", ["literary", "classic"]], ["The Metamorphosis", "literary", ["short-stories", "classic"]], ["The Castle", "literary", ["literary"]], ["In the Penal Colony", "short story", ["short-stories"]]]],
    ["Octavia Butler", 1947, [["Kindred", "sci-fi", ["sci-fi", "classic"]], ["Parable of the Sower", "sci-fi", ["sci-fi", "dystopian"]], ["Dawn", "sci-fi", ["sci-fi", "adventure"]], ["Bloodchild", "sci-fi", ["short-stories", "sci-fi"]]]],
    ["Fyodor Dostoevsky", 1821, [["Crime and Punishment", "literary", ["classic", "literary"]], ["The Brothers Karamazov", "literary", ["classic", "philosophy"]], ["The Idiot", "literary", ["classic", "literary"]], ["Notes from Underground", "literary", ["short-stories", "philosophy"]]]],
  ];

  let bookCount = 0;
  for (const [name, year, books] of data) {
    const authorId = (await pool.query("INSERT INTO authors (name, birth_year) VALUES ($1, $2) RETURNING id", [name, year])).rows[0].id;
    for (const [title, genre, tags] of books) {
      const bookId = (await pool.query("INSERT INTO books (title, author_id, genre) VALUES ($1, $2, $3) RETURNING id", [title, authorId, genre])).rows[0].id;
      for (const t of tags) await pool.query("INSERT INTO book_tags (book_id, tag_id) VALUES ($1, $2)", [bookId, tagId[t]]);
      bookCount += 1;
    }
  }
  console.log(`Seeded ${data.length} authors, ${bookCount} books, ${tagNames.length} tags.\n`);
}

module.exports = { pool, query, withQueryLog, setup, close };
