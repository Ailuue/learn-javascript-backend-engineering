/**
 * Fixing N+1: Batch IN-query vs JOIN
 * ===================================
 * SQLAlchemy offers `selectinload` and `joinedload`; the underlying SQL is what
 * matters, and both have direct raw-SQL equivalents:
 *
 *   Batch IN-query (≈ selectinload) — 2 queries: parents, then
 *     SELECT * FROM books WHERE author_id = ANY($ids). Group children in JS.
 *
 *   JOIN (≈ joinedload) — 1 query with a LEFT JOIN; parents and children arrive
 *     together. You must collapse the duplicated parent rows in JS.
 *
 * Both turn N+1 into a constant number of queries. The nested version adds one
 * more IN-query per level (authors → books → tags = 3 queries).
 *
 * Run:  docker compose up -d (Postgres)  →  node 02_solutions.js
 */

const db = require("./db");

async function demoBatchIn() {
  console.log("=".repeat(60));
  console.log("BATCH IN-QUERY (selectinload analog) — 2 queries");
  console.log("=".repeat(60));

  await db.withQueryLog(
    async () => {
      const authors = (await db.query("SELECT * FROM authors")).rows;
      const ids = authors.map((a) => a.id);
      // One query fetches ALL books for ALL authors via ANY($ids).
      const books = (await db.query("SELECT * FROM books WHERE author_id = ANY($1)", [ids])).rows;
      // Group children to parents in memory.
      const byAuthor = new Map(authors.map((a) => [a.id, []]));
      for (const b of books) byAuthor.get(b.author_id).push(b);
    },
    { showSql: true }
  );
  console.log("  Always exactly 2 queries, no matter how many authors.\n");
}

async function demoJoin() {
  console.log("=".repeat(60));
  console.log("JOIN (joinedload analog) — 1 query, collapse duplicates");
  console.log("=".repeat(60));

  await db.withQueryLog(
    async () => {
      const rows = (
        await db.query(`
          SELECT a.id AS author_id, a.name, b.id AS book_id, b.title
          FROM authors a LEFT JOIN books b ON b.author_id = a.id
          ORDER BY a.id`)
      ).rows;
      // The JOIN repeats each author once per book — collapse in JS.
      const authors = new Map();
      for (const r of rows) {
        if (!authors.has(r.author_id)) authors.set(r.author_id, { name: r.name, books: [] });
        if (r.book_id) authors.get(r.author_id).books.push(r.title);
      }
    },
    { showSql: true }
  );
  console.log("  1 query — but the JOIN multiplies rows (one per book per author).\n");
}

async function demoNested() {
  console.log("=".repeat(60));
  console.log("NESTED BATCH — authors → books → tags  (3 queries)");
  console.log("=".repeat(60));

  await db.withQueryLog(
    async () => {
      const authors = (await db.query("SELECT * FROM authors")).rows;
      const books = (await db.query("SELECT * FROM books WHERE author_id = ANY($1)", [authors.map((a) => a.id)])).rows;
      await db.query(
        `SELECT bt.book_id, t.name FROM tags t JOIN book_tags bt ON bt.tag_id = t.id WHERE bt.book_id = ANY($1)`,
        [books.map((b) => b.id)]
      );
    },
    { showSql: true }
  );
  console.log("  3 queries vs 26 for the nested lazy-load in 01_n_plus_one.js.\n");
}

async function demoSideBySide() {
  console.log("=".repeat(60));
  console.log("SIDE BY SIDE — N+1 vs batch vs join");
  console.log("=".repeat(60));

  console.log("  N+1 (loop):");
  await db.withQueryLog(async () => {
    const authors = (await db.query("SELECT * FROM authors")).rows;
    for (const a of authors) {
      // eslint-disable-next-line no-await-in-loop
      await db.query("SELECT * FROM books WHERE author_id = $1", [a.id]);
    }
  });

  console.log("  Batch IN-query:");
  await db.withQueryLog(async () => {
    const authors = (await db.query("SELECT * FROM authors")).rows;
    await db.query("SELECT * FROM books WHERE author_id = ANY($1)", [authors.map((a) => a.id)]);
  });

  console.log("  JOIN:");
  await db.withQueryLog(async () => {
    await db.query("SELECT a.id, b.id FROM authors a LEFT JOIN books b ON b.author_id = a.id");
  });
}

async function main() {
  await db.setup();
  await demoBatchIn();
  await demoJoin();
  await demoNested();
  await demoSideBySide();
  await db.close();
}

main().catch((err) => {
  console.error("ERROR (is Postgres running?):", err.message);
  process.exit(1);
});
