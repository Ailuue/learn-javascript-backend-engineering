/**
 * Multiple tools: the model chooses which (and how many) to call.
 *
 * Run: `node 03-multi-tool.js [anthropic|openai]`
 *
 * Give the model a small toolbox — `get_weather`, `convert_currency` — and a
 * question that needs both. The model decides which tools are relevant and calls
 * them (often both in a single turn). Your loop doesn't change; it just dispatches
 * by name from a registry. That's how you scale from one tool to twenty: add to the
 * registry and the schema list, leave the loop alone.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const Anthropic = require("@anthropic-ai/sdk");
const OpenAI = require("openai");

// Each tool takes a single args object, so the loop can dispatch uniformly.
function getWeather({ city }) {
  return { Tokyo: "22°C, humid", Paris: "14°C, rain" }[city] || "unknown";
}

function convertCurrency({ amount, from_ccy, to_ccy }) {
  const rates = { "USD->JPY": 157.0, "USD->EUR": 0.92 };
  const rate = rates[`${from_ccy}->${to_ccy}`];
  return rate === undefined ? "unknown" : `${(amount * rate).toFixed(2)} ${to_ccy}`;
}

const TOOLS = { get_weather: getWeather, convert_currency: convertCurrency };

// One schema entry per tool. Provider wrappers below reshape these.
const SCHEMAS = [
  {
    name: "get_weather",
    description: "Current weather for a city.",
    parameters: {
      type: "object",
      properties: { city: { type: "string" } },
      required: ["city"],
    },
  },
  {
    name: "convert_currency",
    description: "Convert an amount between two ISO currency codes.",
    parameters: {
      type: "object",
      properties: {
        amount: { type: "number" },
        from_ccy: { type: "string" },
        to_ccy: { type: "string" },
      },
      required: ["amount", "from_ccy", "to_ccy"],
    },
  },
];
const QUESTION = "What's the weather in Tokyo, and how much is 50 USD in JPY?";

async function runAnthropic() {
  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";
  const tools = SCHEMAS.map((s) => ({ name: s.name, description: s.description, input_schema: s.parameters }));
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
        results.push({ type: "tool_result", tool_use_id: block.id, content: TOOLS[block.name](block.input) });
      }
    }
    messages.push({ role: "user", content: results });
  }
}

async function runOpenAI() {
  const client = new OpenAI();
  const model = process.env.OPENAI_MODEL || "gpt-4o";
  const tools = SCHEMAS.map((s) => ({ type: "function", function: s }));
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
      messages.push({ role: "tool", tool_call_id: tc.id, content: TOOLS[tc.function.name](args) });
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

module.exports = { getWeather, convertCurrency, runAnthropic, runOpenAI };
