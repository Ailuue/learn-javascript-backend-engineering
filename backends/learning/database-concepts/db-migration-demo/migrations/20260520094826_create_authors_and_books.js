// Initial schema — the first migration revision.
// up() builds the schema; down() reverses it (drop in FK-safe order).

exports.up = (knex) =>
  knex.schema
    .createTable("authors", (t) => {
      t.increments("id").primary();
      t.string("name", 100).notNullable();
      t.integer("birth_year");
    })
    .createTable("books", (t) => {
      t.increments("id").primary();
      t.string("title", 200).notNullable();
      t.integer("author_id").notNullable().references("id").inTable("authors");
      t.integer("published_year");
      t.string("genre", 50);
      t.text("summary");
    });

exports.down = (knex) => knex.schema.dropTableIfExists("books").dropTableIfExists("authors");
