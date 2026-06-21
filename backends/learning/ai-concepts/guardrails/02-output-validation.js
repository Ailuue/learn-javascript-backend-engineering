/**
 * Output validation: treat the model's response as untrusted input.
 *
 * Run: `node 02-output-validation.js [anthropic|openai]`
 *
 * Even with no attacker, model output can be wrong in ways your code must catch
 * before acting on it:
 *   - off allow-list: a label outside the set you support (hallucinated category),
 *   - too long: an unbounded blob where you expected a short value,
 *   - leaking PII/secrets: an email, card number, or key in the text.
 *
 * We run a real classification and validate the label against an allow-list (reject
 * anything else), then run the same validators over a crafted string to show the
 * PII/length checks firing. The pattern: validate -> on failure, fall back or
 * regenerate; never pass unvalidated model output to the next step.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const Anthropic = require("@anthropic-ai/sdk");
const OpenAI = require("openai");

const ALLOWED_LABELS = new Set(["BILLING", "BUG", "FEATURE"]);
const MAX_LEN = 200;

// Crude PII/secret patterns — illustrative, not exhaustive. Real systems use a
// dedicated scanner, but the principle (scan before trusting) is the point.
const PATTERNS = {
  email: /[\w.+-]+@[\w-]+\.[\w.-]+/,
  credit_card: /\b(?:\d[ -]?){13,16}\b/,
  api_key: /\b(sk|pa)-[A-Za-z0-9]{8,}\b/,
};

function findViolations(text, { allowLabels = false } = {}) {
  const problems = [];
  if (allowLabels && !ALLOWED_LABELS.has(text.toUpperCase())) {
    problems.push(`label ${JSON.stringify(text.toUpperCase())} not in allow-list ${JSON.stringify([...ALLOWED_LABELS].sort())}`);
  }
  if (text.length > MAX_LEN) {
    problems.push(`too long (${text.length} > ${MAX_LEN} chars)`);
  }
  for (const [name, pattern] of Object.entries(PATTERNS)) {
    if (pattern.test(text)) problems.push(`contains possible ${name}`);
  }
  return problems;
}

async function classify(provider, text) {
  const system = "Classify the message as BILLING, BUG, or FEATURE. Reply with the label only.";
  if (provider === "anthropic") {
    const client = new Anthropic();
    const r = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-opus-4-8",
      max_tokens: 16,
      system,
      messages: [{ role: "user", content: text }],
    });
    return r.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  }

  const client = new OpenAI();
  const r = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    max_tokens: 16,
    messages: [
      { role: "system", content: system },
      { role: "user", content: text },
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
      const label = await classify(provider, "I was double charged this month");
      const violations = findViolations(label, { allowLabels: true });
      const verdict = violations.length === 0 ? "ACCEPT" : `REJECT (${violations.join("; ")})`;
      console.log(`  model label: ${JSON.stringify(label)} -> ${verdict}`);
    } catch (err) {
      // e.g. unfunded key -> 429 insufficient_quota
      console.log(`  [skipped — ${brief(err)}]`);
    }
  }

  // Same validators over a deliberately bad string, so the PII/length checks fire.
  console.log("\n--- validators on a crafted bad output ---");
  const bad = "Sure! Contact the user at jane.doe@example.com or call 4111 1111 1111 1111.";
  console.log(`  input: ${JSON.stringify(bad)}`);
  console.log(`  violations: ${JSON.stringify(findViolations(bad))}`);
}

if (require.main === module) {
  main();
}

module.exports = { findViolations, classify };
