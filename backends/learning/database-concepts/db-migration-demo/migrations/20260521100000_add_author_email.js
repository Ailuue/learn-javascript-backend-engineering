// A schema change WITH a data migration. up() adds a column, then backfills
// existing rows in the same migration; down() drops the column.

exports.up = async (knex) => {
  await knex.schema.alterTable("authors", (t) => t.string("email", 200));

  // Data migration: derive a placeholder email for every existing author.
  // Running this inside the migration keeps schema + data changes atomic.
  const authors = await knex("authors").select("id", "name");
  for (const a of authors) {
    const email = `${a.name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`;
    // eslint-disable-next-line no-await-in-loop
    await knex("authors").where({ id: a.id }).update({ email });
  }
};

exports.down = (knex) => knex.schema.alterTable("authors", (t) => t.dropColumn("email"));
