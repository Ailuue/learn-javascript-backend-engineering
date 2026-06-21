/**
 * Semantic search: rank a corpus by meaning, not keyword overlap.
 *
 * Run: `node 02-semantic-search.js [openai|voyage]`
 *
 * We embed a small "knowledge base" once, embed a query, and rank documents by
 * cosine similarity to the query. Note the winning document for "my card was
 * declined" shares almost no words with the query — keyword search would miss it;
 * semantic search finds it because the *meaning* matches.
 *
 * This is the retrieval step of RAG, in miniature. At scale you'd store the document
 * vectors in a vector database (see ../../database-concepts/pgvector-demo/) instead
 * of a JavaScript array, but the ranking idea is identical.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const OpenAI = require("openai");

const CORPUS = [
  "To return an item, visit your orders page and click 'Start a return'.",
  "Payment failures are usually caused by an expired or blocked card.",
  "Our office is open Monday to Friday, 9am to 5pm.",
  "You can change your notification settings under Account > Preferences.",
];
const QUERY = "my card was declined at checkout";

function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function embed(provider, texts) {
  if (provider === "openai") {
    const client = new OpenAI();
    const resp = await client.embeddings.create({
      model: process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small",
      input: texts,
    });
    return resp.data.map((d) => d.embedding);
  }

  // Voyage has no official JS SDK; call the REST endpoint directly.
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error("VOYAGE_API_KEY is not set");
  const resp = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      input: texts,
      model: process.env.VOYAGE_EMBED_MODEL || "voyage-3",
      input_type: "document",
    }),
  });
  if (!resp.ok) throw new Error(`Voyage API ${resp.status}: ${(await resp.text()).slice(0, 110)}`);
  return (await resp.json()).data.map((d) => d.embedding);
}

async function search(provider) {
  // Embed corpus + query together, then score each doc against the query.
  const vectors = await embed(provider, [...CORPUS, QUERY]);
  const queryVec = vectors[vectors.length - 1];
  const docVecs = vectors.slice(0, -1);

  const ranked = docVecs
    .map((dv, i) => [cosine(queryVec, dv), CORPUS[i]])
    .sort((a, b) => b[0] - a[0]);

  console.log(`  query: "${QUERY}"`);
  for (const [score, doc] of ranked) {
    console.log(`    ${score.toFixed(3)}  ${doc}`);
  }
}

function brief(err) {
  return `${err?.constructor?.name || "Error"}: ${String(err?.message || err).split("\n")[0].slice(0, 110)}`;
}

async function main() {
  // Voyage is free; pass "both"/"openai" to include OpenAI.
  const which = process.argv[2] || "voyage";
  for (const provider of ["openai", "voyage"]) {
    if (which === provider || which === "both") {
      console.log(`\n=== ${provider} ===`);
      try {
        await search(provider);
      } catch (err) {
        // e.g. missing/unfunded key
        console.log(`  [skipped — ${brief(err)}]`);
      }
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { cosine, embed, search };
