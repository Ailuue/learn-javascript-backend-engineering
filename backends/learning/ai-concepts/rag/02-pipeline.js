/**
 * End-to-end RAG: retrieve relevant context, then generate a grounded answer.
 *
 * Run: `node 02-pipeline.js [anthropic|openai]`
 *
 * The full loop:
 *   1. INDEX  — embed each document chunk (Voyage embeddings, free tier) and keep them.
 *   2. RETRIEVE — embed the question, score every chunk by cosine similarity, take
 *      the top few.
 *   3. AUGMENT — build a prompt containing ONLY those chunks as context, with a rule:
 *      answer from the context, and say "I don't know" if it isn't there.
 *   4. GENERATE — call the model (Claude and/or GPT) to write the answer.
 *
 * The question asks about a company-specific policy the model was never trained on.
 * Without retrieval it would guess; with retrieval it answers correctly — and for a
 * question outside the context, the "I don't know" rule curbs hallucination.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const Anthropic = require("@anthropic-ai/sdk");
const OpenAI = require("openai");

const KNOWLEDGE_BASE = [
  "Acme Cloud's free tier includes 5 GB of storage and 100 GB of monthly bandwidth.",
  "Acme Cloud paid plans start at $12/month for the Pro tier with 1 TB of storage.",
  "Support response time is under 4 hours for Pro customers and 24 hours on free.",
  "Acme Cloud stores all data encrypted at rest using AES-256.",
  "The Acme Cloud API is rate limited to 600 requests per minute per account.",
];
const QUESTION = "What's the API rate limit, and how much storage does the free tier give me?";

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

// Retrieval uses Voyage (Anthropic-recommended embeddings, generous free tier),
// so the whole pipeline runs without an OpenAI key. Swap to OpenAI's
// client.embeddings.create if you prefer — the pipeline is identical either way.
async function embed(texts) {
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

async function retrieve(question, k = 2) {
  const vectors = await embed([...KNOWLEDGE_BASE, question]);
  const qVec = vectors[vectors.length - 1];
  const docVecs = vectors.slice(0, -1);
  return docVecs
    .map((d, i) => [cosine(qVec, d), KNOWLEDGE_BASE[i]])
    .sort((a, b) => b[0] - a[0])
    .slice(0, k)
    .map(([, doc]) => doc);
}

function buildPrompt(question, context) {
  const joined = context.map((c) => `- ${c}`).join("\n");
  return (
    "Answer the question using ONLY the context below. " +
    'If the answer is not in the context, say "I don\'t know".\n\n' +
    `Context:\n${joined}\n\nQuestion: ${question}`
  );
}

async function generate(provider, prompt) {
  if (provider === "anthropic") {
    const client = new Anthropic();
    const r = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-opus-4-8",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });
    return r.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  }

  const client = new OpenAI();
  const r = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });
  return r.choices[0].message.content.trim();
}

function brief(err) {
  return `${err?.constructor?.name || "Error"}: ${String(err?.message || err).split("\n")[0].slice(0, 110)}`;
}

async function main() {
  const which = process.argv[2] || "both";

  let context;
  try {
    context = await retrieve(QUESTION, 2); // Voyage embeddings — provider-independent
  } catch (err) {
    // e.g. missing Voyage key
    console.log(`[retrieval skipped — ${brief(err)}]`);
    return;
  }
  console.log("retrieved context:");
  for (const c of context) console.log("  -", c);
  const prompt = buildPrompt(QUESTION, context);

  for (const provider of ["anthropic", "openai"]) {
    if (which === provider || which === "both") {
      console.log(`\n=== ${provider} ===`);
      try {
        console.log(await generate(provider, prompt));
      } catch (err) {
        // e.g. unfunded key -> 429 insufficient_quota
        console.log(`  [skipped — ${brief(err)}]`);
      }
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { cosine, embed, retrieve, buildPrompt, generate };
