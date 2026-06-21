/**
 * The agent loop: keep calling tools until the model is done.
 *
 * Run: `node 02-agent-loop.js [anthropic|openai]`
 *
 * 01 did a single round trip. Real tasks need several: the model calls a tool, sees
 * the result, decides it needs another, and so on. The `while` loop here keeps going
 * until the model stops asking for tools and produces a final answer.
 *
 * The question ("How many more people live in Japan than Canada?") forces at least
 * two `get_population` calls, so you can watch the loop iterate. This loop, with a
 * richer tool set, is exactly what a coding agent or a research agent runs.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const Anthropic = require("@anthropic-ai/sdk");
const OpenAI = require("openai");

// --- The tools, as plain functions. Shared by both providers. ----------------
const POP = { Japan: 124_000_000, Canada: 39_000_000, Brazil: 203_000_000 };

function getPopulation(country) {
  return String(POP[country] ?? "unknown");
}

const TOOLS = { get_population: getPopulation };

// JSON Schema for the arguments — identical content, wrapped differently per SDK.
const SCHEMA = {
  type: "object",
  properties: { country: { type: "string" } },
  required: ["country"],
};
const QUESTION = "How many more people live in Japan than Canada? Show the final number.";

async function runAnthropic() {
  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";
  const tools = [{ name: "get_population", description: "Population of a country.", input_schema: SCHEMA }];
  const messages = [{ role: "user", content: QUESTION }];

  for (;;) {
    const r = await client.messages.create({ model, max_tokens: 1024, tools, messages });
    if (r.stop_reason !== "tool_use") {
      console.log("final:", r.content.filter((b) => b.type === "text").map((b) => b.text).join(""));
      return;
    }

    messages.push({ role: "assistant", content: r.content });
    const results = [];
    for (const block of r.content) {
      if (block.type === "tool_use") {
        console.log(`  call: ${block.name}(${JSON.stringify(block.input)})`);
        const output = TOOLS[block.name](block.input.country);
        results.push({ type: "tool_result", tool_use_id: block.id, content: output });
      }
    }
    messages.push({ role: "user", content: results });
  }
}

async function runOpenAI() {
  const client = new OpenAI();
  const model = process.env.OPENAI_MODEL || "gpt-4o";
  const tools = [
    {
      type: "function",
      function: { name: "get_population", description: "Population of a country.", parameters: SCHEMA },
    },
  ];
  const messages = [{ role: "user", content: QUESTION }];

  for (;;) {
    const r = await client.chat.completions.create({ model, tools, messages });
    const msg = r.choices[0].message;
    if (!msg.tool_calls) {
      console.log("final:", msg.content);
      return;
    }

    messages.push(msg);
    for (const tc of msg.tool_calls) {
      const args = JSON.parse(tc.function.arguments);
      console.log(`  call: ${tc.function.name}(${JSON.stringify(args)})`);
      const output = TOOLS[tc.function.name](args.country);
      messages.push({ role: "tool", tool_call_id: tc.id, content: output });
    }
  }
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

module.exports = { getPopulation, runAnthropic, runOpenAI };
