/**
 * Zero-shot vs few-shot prompting on the same classification task.
 *
 * Run: `node 01-zero-vs-few-shot.js [anthropic|openai]`
 *
 * Task: classify a support message as BILLING, BUG, or FEATURE — and return ONLY
 * that label. Zero-shot (just an instruction) often works but drifts in format
 * ("This looks like a billing issue."). Few-shot (a few worked examples first) pins
 * the output down to exactly the label. Run both and compare.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const Anthropic = require("@anthropic-ai/sdk");
const OpenAI = require("openai");

const INPUTS = [
  "I was charged twice this month and want a refund.",
  "The export button does nothing when I click it.",
  "Any chance you could add dark mode?",
];

const ZERO_SHOT = "Classify the support message as BILLING, BUG, or FEATURE.";

// Few-shot: the instruction PLUS examples that demonstrate the exact output we want.
const FEW_SHOT = `Classify the support message as BILLING, BUG, or FEATURE. Reply with the label only.

Message: My credit card was declined but I still got billed.
Label: BILLING

Message: The app crashes when I upload a PNG.
Label: BUG

Message: It would be great to have CSV export.
Label: FEATURE`;

async function chat(provider, system, user) {
  if (provider === "anthropic") {
    const client = new Anthropic();
    const r = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-opus-4-8",
      max_tokens: 64,
      system,
      messages: [{ role: "user", content: user }],
    });
    return r.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  }

  const client = new OpenAI();
  const r = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    max_tokens: 64,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return r.choices[0].message.content.trim();
}

function brief(err) {
  return `${err?.constructor?.name || "Error"}: ${String(err?.message || err).split("\n")[0].slice(0, 110)}`;
}

async function main() {
  const which = process.argv[2] || "both";
  for (const provider of ["anthropic", "openai"]) {
    if (which !== provider && which !== "both") continue;
    console.log(`\n=== ${provider} ===`);
    try {
      for (const text of INPUTS) {
        const zero = await chat(provider, ZERO_SHOT, `Message: ${text}`);
        const few = await chat(provider, FEW_SHOT, `Message: ${text}\nLabel:`);
        console.log(`  input : ${text}`);
        console.log(`  zero  : ${JSON.stringify(zero)}`);
        console.log(`  few   : ${JSON.stringify(few)}`);
      }
    } catch (err) {
      // e.g. unfunded key -> 429 insufficient_quota
      console.log(`  [skipped — ${brief(err)}]`);
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { chat };
