/**
 * Counting tokens and estimating cost.
 *
 * Run: `node 04-token-counting-cost.js [anthropic|openai]`
 *
 * You pay per token — both for what you send (input) and what you get back
 * (output), at different rates. Two skills matter:
 *
 *   1. Counting tokens BEFORE you send, so you can reject an over-budget request or
 *      pick a cheaper model. Anthropic has a dedicated `countTokens` endpoint.
 *      OpenAI doesn't expose one in the SDK — you'd count locally with a tokenizer
 *      library (e.g. `js-tiktoken`). NOTE: tiktoken is OpenAI's tokenizer and is
 *      WRONG for Claude — never use it to estimate Anthropic tokens; use the
 *      countTokens endpoint.
 *   2. Reading actual usage AFTER the call (`usage` on the response) and turning it
 *      into dollars.
 *
 * Prices below are illustrative and change often — always check the provider's
 * pricing page. They live here only to show the arithmetic.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const Anthropic = require("@anthropic-ai/sdk");
const OpenAI = require("openai");

const PROMPT = "Summarize the CAP theorem for a backend engineer in 3 bullet points.";

// USD per 1,000,000 tokens (input, output). Illustrative — verify current pricing.
const PRICES = {
  anthropic: { input: 5.0, output: 25.0 }, // Claude Opus tier
  openai: { input: 2.5, output: 10.0 }, // GPT-4o tier
};

function dollars(provider, inTok, outTok) {
  const p = PRICES[provider];
  return (inTok * p.input + outTok * p.output) / 1_000_000;
}

async function runAnthropic() {
  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";
  const messages = [{ role: "user", content: PROMPT }];

  // Pre-flight: ask the API exactly how many input tokens this will be.
  const pre = await client.messages.countTokens({ model, messages });
  console.log(`pre-flight input tokens: ${pre.input_tokens}`);

  const resp = await client.messages.create({ model, max_tokens: 1024, messages });
  const u = resp.usage; // real usage, billed
  console.log(`actual: in=${u.input_tokens} out=${u.output_tokens}`);
  console.log(`estimated cost: $${dollars("anthropic", u.input_tokens, u.output_tokens).toFixed(6)}`);
}

async function runOpenAI() {
  const client = new OpenAI();
  const model = process.env.OPENAI_MODEL || "gpt-4o";

  // OpenAI has no token-counting endpoint. For a true pre-flight count you'd use a
  // local tokenizer (js-tiktoken). Here we just read usage off the response after.
  const resp = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: PROMPT }],
  });
  const u = resp.usage;
  console.log(`actual: in=${u.prompt_tokens} out=${u.completion_tokens}`);
  console.log(`estimated cost: $${dollars("openai", u.prompt_tokens, u.completion_tokens).toFixed(6)}`);
}

function brief(err) {
  return `${err?.constructor?.name || "Error"}: ${String(err?.message || err).split("\n")[0].slice(0, 110)}`;
}

async function main() {
  const which = process.argv[2] || "both";
  for (const [name, fn] of Object.entries({ anthropic: runAnthropic, openai: runOpenAI })) {
    if (which === name || which === "both") {
      console.log(`\n=== ${name} ===`);
      try {
        await fn();
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

module.exports = { dollars, runAnthropic, runOpenAI };
