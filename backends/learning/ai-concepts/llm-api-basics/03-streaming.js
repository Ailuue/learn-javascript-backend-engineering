/**
 * Streaming: print tokens as they arrive instead of waiting for the whole reply.
 *
 * Run: `node 03-streaming.js [anthropic|openai]`
 *
 * Without streaming, the user stares at a frozen screen until the entire response is
 * generated — which can be many seconds for a long answer. Streaming delivers the
 * text token-by-token, so a UI (or a CLI like this one) can render it live. This is
 * the single biggest perceived-latency win in any LLM product.
 *
 * Both SDKs expose streaming as a stream of small chunks. Anthropic's `.stream()`
 * helper emits already-accumulated text via a `text` event; OpenAI yields raw deltas
 * you iterate over with `for await`.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const Anthropic = require("@anthropic-ai/sdk");
const OpenAI = require("openai");

const PROMPT = "Explain how a TCP handshake works, in about 4 sentences.";

async function streamAnthropic() {
  const client = new Anthropic();
  const stream = client.messages.stream({
    model: process.env.ANTHROPIC_MODEL || "claude-opus-4-8",
    max_tokens: 1024,
    messages: [{ role: "user", content: PROMPT }],
  });
  // The `text` event fires with each already-decoded text delta.
  stream.on("text", (delta) => process.stdout.write(delta));
  await stream.finalMessage(); // wait for the stream to finish
  process.stdout.write("\n");
}

async function streamOpenAI() {
  const client = new OpenAI();
  const stream = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    messages: [{ role: "user", content: PROMPT }],
    stream: true,
  });
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content; // may be null on the first/last chunk
    if (delta) process.stdout.write(delta);
  }
  process.stdout.write("\n");
}

function brief(err) {
  return `${err?.constructor?.name || "Error"}: ${String(err?.message || err).split("\n")[0].slice(0, 110)}`;
}

async function main() {
  const which = process.argv[2] || "both";
  for (const [name, fn] of Object.entries({ anthropic: streamAnthropic, openai: streamOpenAI })) {
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

module.exports = { streamAnthropic, streamOpenAI };
