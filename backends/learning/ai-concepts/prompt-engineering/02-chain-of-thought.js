/**
 * Chain-of-thought: make the model reason before it answers.
 *
 * Run: `node 02-chain-of-thought.js [anthropic|openai]`
 *
 * We ask a small multi-step word problem two ways:
 *   - "answer only" — the model blurts a number and often gets it wrong.
 *   - "think step by step, then give the answer on a final line" — it works through
 *     the steps and lands the right number far more often.
 *
 * CoT trades tokens and latency for accuracy. Use it when correctness on reasoning
 * matters more than speed. (Newer "reasoning" models do this internally; CoT
 * prompting is how you get the same effect from a standard chat model.)
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const Anthropic = require("@anthropic-ai/sdk");
const OpenAI = require("openai");

const PROBLEM =
  "A server handles 1,200 requests/minute. 35% are cache hits taking 2ms each; " +
  "the rest miss and take 50ms each. What is the average response time in ms? ";

const ANSWER_ONLY = PROBLEM + "Respond with only the number.";
const COT = PROBLEM + "Think step by step. Put the final number on its own last line prefixed with 'ANSWER: '.";

async function chat(provider, user) {
  if (provider === "anthropic") {
    const client = new Anthropic();
    const r = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-opus-4-8",
      max_tokens: 1024,
      messages: [{ role: "user", content: user }],
    });
    return r.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  }

  const client = new OpenAI();
  const r = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    max_tokens: 1024,
    messages: [{ role: "user", content: user }],
  });
  return r.choices[0].message.content.trim();
}

function brief(err) {
  return `${err?.constructor?.name || "Error"}: ${String(err?.message || err).split("\n")[0].slice(0, 110)}`;
}

async function main() {
  // Correct answer: 0.35*2 + 0.65*50 = 0.7 + 32.5 = 33.2 ms
  const which = process.argv[2] || "both";
  for (const provider of ["anthropic", "openai"]) {
    if (which !== provider && which !== "both") continue;
    console.log(`\n=== ${provider} ===  (correct answer: 33.2)`);
    try {
      console.log("  answer-only :", await chat(provider, ANSWER_ONLY));
      const cot = await chat(provider, COT);
      // The reasoning is useful to read, but a program only wants the final line.
      const final = cot.split("\n").pop();
      console.log("  chain-of-thought final line:", final);
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
