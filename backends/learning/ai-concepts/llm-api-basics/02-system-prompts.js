/**
 * System prompts (steering behavior) and multi-turn conversations.
 *
 * Run: `node 02-system-prompts.js [anthropic|openai]`
 *
 * Two lessons here:
 *   1. The SAME user question gives very different answers depending on the system
 *      prompt. That's your main lever for controlling tone, format, and persona.
 *   2. The API is STATELESS. To have a "conversation", you keep a list of messages
 *      yourself and resend the whole thing each turn. Notice how the second call
 *      includes the first exchange — that's the only reason the model "remembers".
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const Anthropic = require("@anthropic-ai/sdk");
const OpenAI = require("openai");

const SYSTEM = "You are a grumpy senior engineer. Answer correctly but tersely, with a sigh.";
const TURN_1 = "What is a database index?";
const TURN_2 = "Could it ever slow things down?"; // 'it' only makes sense if turn 1 is remembered

async function runAnthropic() {
  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

  // Anthropic: system is a TOP-LEVEL parameter, not a message.
  const history = [{ role: "user", content: TURN_1 }];
  const r1 = await client.messages.create({ model, max_tokens: 1024, system: SYSTEM, messages: history });
  const a1 = r1.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  console.log("A1:", a1);

  // Append the assistant's reply + the next user turn, then resend EVERYTHING.
  history.push({ role: "assistant", content: a1 });
  history.push({ role: "user", content: TURN_2 });
  const r2 = await client.messages.create({ model, max_tokens: 1024, system: SYSTEM, messages: history });
  console.log("A2:", r2.content.filter((b) => b.type === "text").map((b) => b.text).join(""));
}

async function runOpenAI() {
  const client = new OpenAI();
  const model = process.env.OPENAI_MODEL || "gpt-4o";

  // OpenAI: system is the FIRST message in the list (role="system").
  const history = [
    { role: "system", content: SYSTEM },
    { role: "user", content: TURN_1 },
  ];
  const r1 = await client.chat.completions.create({ model, messages: history });
  const a1 = r1.choices[0].message.content;
  console.log("A1:", a1);

  history.push({ role: "assistant", content: a1 });
  history.push({ role: "user", content: TURN_2 });
  const r2 = await client.chat.completions.create({ model, messages: history });
  console.log("A2:", r2.choices[0].message.content);
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

module.exports = { runAnthropic, runOpenAI };
