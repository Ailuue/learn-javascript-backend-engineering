/**
 * One tool, one round trip — the tool-use cycle spelled out by hand.
 *
 * Run: `node 01-single-tool.js [anthropic|openai]`
 *
 * The model can't know live weather, so we give it a `get_weather` tool. Watch the
 * cycle: we send the question + tool definition; the model asks us to call
 * `get_weather(city=...)`; OUR code runs the (mocked) function; we send the result
 * back; the model writes the final natural-language answer.
 *
 * The model only ever *requests* the call. We execute it. That boundary is the whole
 * security story of tool use.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const Anthropic = require("@anthropic-ai/sdk");
const OpenAI = require("openai");

/** Pretend this hits a real weather API. Returns a string the model can read. */
function getWeather(city) {
  const fake = { Lisbon: "19°C, clear", Oslo: "3°C, snow" };
  return fake[city] || "unknown";
}

const QUESTION = "What's the weather in Lisbon? Reply in one sentence.";

async function runAnthropic() {
  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";
  const tools = [
    {
      name: "get_weather",
      description: "Get the current weather for a city.",
      input_schema: {
        type: "object",
        properties: { city: { type: "string", description: "City name" } },
        required: ["city"],
      },
    },
  ];
  const messages = [{ role: "user", content: QUESTION }];
  const r = await client.messages.create({ model, max_tokens: 512, tools, messages });
  console.log("stop_reason:", r.stop_reason); // -> "tool_use"

  // Echo the assistant's turn (including the tool_use block) back into history.
  messages.push({ role: "assistant", content: r.content });

  const results = [];
  for (const block of r.content) {
    if (block.type === "tool_use") {
      console.log(`  model wants: ${block.name}(${JSON.stringify(block.input)})`);
      const output = getWeather(block.input.city);
      results.push({ type: "tool_result", tool_use_id: block.id, content: output });
    }
  }
  messages.push({ role: "user", content: results });

  const final = await client.messages.create({ model, max_tokens: 512, tools, messages });
  console.log("final:", final.content.filter((b) => b.type === "text").map((b) => b.text).join(""));
}

async function runOpenAI() {
  const client = new OpenAI();
  const model = process.env.OPENAI_MODEL || "gpt-4o";
  const tools = [
    {
      type: "function",
      function: {
        name: "get_weather",
        description: "Get the current weather for a city.",
        parameters: {
          type: "object",
          properties: { city: { type: "string", description: "City name" } },
          required: ["city"],
        },
      },
    },
  ];
  const messages = [{ role: "user", content: QUESTION }];
  const r = await client.chat.completions.create({ model, tools, messages });
  const msg = r.choices[0].message;
  console.log("finish_reason:", r.choices[0].finish_reason); // -> "tool_calls"

  messages.push(msg); // the assistant message, carrying tool_calls
  for (const tc of msg.tool_calls) {
    const args = JSON.parse(tc.function.arguments);
    console.log(`  model wants: ${tc.function.name}(${JSON.stringify(args)})`);
    const output = getWeather(args.city);
    messages.push({ role: "tool", tool_call_id: tc.id, content: output });
  }

  const final = await client.chat.completions.create({ model, tools, messages });
  console.log("final:", final.choices[0].message.content);
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

module.exports = { getWeather, runAnthropic, runOpenAI };
