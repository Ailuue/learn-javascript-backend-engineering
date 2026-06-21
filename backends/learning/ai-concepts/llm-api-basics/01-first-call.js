/**
 * The smallest possible LLM call, against both providers.
 *
 * Run: `node 01-first-call.js [anthropic|openai]` (no arg = both).
 *
 * The point of this file: a request is just a list of role-tagged messages, and the
 * response is an object you dig the text out of. The two SDKs differ only in how
 * that object is shaped.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") }); // pulls API keys + model names from ../.env

const Anthropic = require("@anthropic-ai/sdk");
const OpenAI = require("openai");

const PROMPT = "In one sentence, what is a backend engineer?";

async function callAnthropic() {
  console.log(`Using Anthropic model: ${process.env.ANTHROPIC_MODEL || "claude-opus-4-8"}`);
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
  const resp = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-opus-4-8",
    max_tokens: 1024, // a hard cap on the *response* length, in tokens
    messages: [{ role: "user", content: PROMPT }],
  });
  // resp.content is a LIST of blocks (text, tool_use, ...). Grab the text ones.
  return resp.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
}

async function callOpenAI() {
  console.log(`Using OpenAI model: ${process.env.OPENAI_MODEL || "gpt-4o"}`);
  const client = new OpenAI(); // reads OPENAI_API_KEY from the environment
  const resp = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    messages: [{ role: "user", content: PROMPT }],
  });
  // OpenAI returns one or more "choices"; the text is on the first choice.
  return resp.choices[0].message.content;
}

// One-line summary of an error, for the `[skipped — …]` lines below.
function brief(err) {
  return `${err?.constructor?.name || "Error"}: ${String(err?.message || err).split("\n")[0].slice(0, 110)}`;
}

async function main() {
  const which = process.argv[2] || "both";
  const providers = { anthropic: callAnthropic, openai: callOpenAI };

  for (const [name, fn] of Object.entries(providers)) {
    if (which === name || which === "both") {
      console.log(`\n=== ${name} ===`);
      try {
        console.log(await fn());
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

module.exports = { callAnthropic, callOpenAI };
