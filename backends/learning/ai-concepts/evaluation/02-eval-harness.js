/**
 * A tiny eval harness: run a fixed test set, score it, report accuracy.
 *
 * Run: `node 02-eval-harness.js [anthropic|openai]`
 *
 * This is the regression test for a prompt. We have a DATASET of inputs with known
 * correct labels. We run each through the model under test, compare the output to the
 * expected label programmatically (no judge needed — the answer is exact), and print
 * an accuracy number.
 *
 * The workflow this enables: change the SYSTEM prompt below, re-run, and watch the
 * accuracy move. That number is how you tell a real improvement from a vibe.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const Anthropic = require("@anthropic-ai/sdk");
const OpenAI = require("openai");

// The fixed evaluation set: [input, expected label]. Grow this over time with every
// real-world case that surprised you — that's how the suite gets valuable.
const DATASET = [
  ["I want a refund for my subscription", "BILLING"],
  ["The page crashes when I hit save", "BUG"],
  ["Please add a dark theme", "FEATURE"],
  ["My invoice has the wrong amount", "BILLING"],
  ["Login button does nothing on mobile", "BUG"],
];

// The prompt under test. Tweak this and re-run to see accuracy change.
const SYSTEM = "Classify the support message as exactly one of: BILLING, BUG, FEATURE. Reply with the label only.";

async function classify(provider, text) {
  if (provider === "anthropic") {
    const client = new Anthropic();
    const r = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-opus-4-8",
      max_tokens: 16,
      system: SYSTEM,
      messages: [{ role: "user", content: text }],
    });
    return r.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim().toUpperCase();
  }

  const client = new OpenAI();
  const r = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    max_tokens: 16,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: text },
    ],
  });
  return r.choices[0].message.content.trim().toUpperCase();
}

async function evaluate(provider) {
  let correct = 0;
  for (const [text, expected] of DATASET) {
    const got = await classify(provider, text);
    const ok = got === expected;
    if (ok) correct += 1;
    console.log(`  ${ok ? "✓" : "✗"} expected=${expected.padEnd(8)} got=${got.padEnd(8)} | ${text}`);
  }
  const pct = (100 * correct) / DATASET.length;
  console.log(`  accuracy: ${correct}/${DATASET.length} = ${pct.toFixed(0)}%`);
}

function brief(err) {
  return `${err?.constructor?.name || "Error"}: ${String(err?.message || err).split("\n")[0].slice(0, 110)}`;
}

async function main() {
  const which = process.argv[2] || "both";
  for (const provider of ["anthropic", "openai"]) {
    if (which === provider || which === "both") {
      console.log(`\n=== ${provider} ===`);
      try {
        await evaluate(provider);
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

module.exports = { DATASET, classify, evaluate };
