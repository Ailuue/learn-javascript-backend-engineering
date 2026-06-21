/**
 * Asking for JSON and parsing it — the simple, fragile way.
 *
 * Run: `node 01-json-mode.js [anthropic|openai]`
 *
 * The naive approach: instruct the model to return JSON, then `JSON.parse()` the
 * text. It usually works. But notice the things that can break it — a ```json
 * fence, a "Sure! Here is the JSON:" preamble, a trailing comment. This file
 * deliberately does only light cleanup so you can see how brittle "parse the text"
 * is. The next file ([02](02-zod-schema.js)) removes the guesswork with schema
 * enforcement.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const Anthropic = require("@anthropic-ai/sdk");
const OpenAI = require("openai");

const PROMPT =
  'Extract the person\'s name, age (integer), and city from this text as JSON ' +
  'with keys "name", "age", "city". Return ONLY the JSON.\n\n' +
  "Text: Maria is a 34-year-old engineer living in Lisbon.";

async function getText(provider) {
  if (provider === "anthropic") {
    const client = new Anthropic();
    const r = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-opus-4-8",
      max_tokens: 256,
      messages: [{ role: "user", content: PROMPT }],
    });
    return r.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  }

  const client = new OpenAI();
  const r = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    max_tokens: 256,
    // OpenAI's "JSON mode": guarantees syntactically valid JSON (but not a
    // specific shape — that's what schema enforcement in 02 adds).
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: PROMPT }],
  });
  return r.choices[0].message.content;
}

/** The kind of defensive cleanup you end up writing without schema enforcement. */
function stripFences(text) {
  text = text.trim();
  if (text.startsWith("```")) {
    text = text.split("```")[1];
    if (text.startsWith("json")) text = text.slice(4);
  }
  return text.trim();
}

function brief(err) {
  return `${err?.constructor?.name || "Error"}: ${String(err?.message || err).split("\n")[0].slice(0, 110)}`;
}

async function main() {
  const which = process.argv[2] || "both";
  for (const provider of ["anthropic", "openai"]) {
    if (which !== provider && which !== "both") continue;
    console.log(`\n=== ${provider} ===`);
    let raw;
    try {
      raw = await getText(provider);
    } catch (err) {
      // e.g. unfunded key -> 429 insufficient_quota
      console.log(`  [skipped — ${brief(err)}]`);
      continue;
    }
    console.log("raw text:", JSON.stringify(raw));
    try {
      const data = JSON.parse(stripFences(raw));
      console.log("parsed object:", data, "| age type:", typeof data.age);
    } catch (err) {
      console.log("FAILED to parse:", err.message);
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { getText, stripFences };
