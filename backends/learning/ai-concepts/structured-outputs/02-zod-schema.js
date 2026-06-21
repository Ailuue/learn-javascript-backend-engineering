/**
 * Schema-enforced output: define a Zod schema, get back a validated object.
 *
 * Run: `node 02-zod-schema.js [anthropic|openai]`
 *
 * This is the production answer to "I need data, not text." You define the shape
 * ONCE as a Zod schema and hand it to the SDK's parse helper. The provider
 * constrains generation to match the schema, and the SDK returns a validated
 * object — no fences, no preamble, no `JSON.parse`, no guessing about types.
 *
 * (Zod is a runtime schema validator for JavaScript — you declare the shape once
 * and validate against it.)
 *
 * Both SDKs accept the *same* Zod schema; only the helper, parameter, and where the
 * result lands differ:
 *   - Anthropic: messages.parse({ output_config: { format: zodOutputFormat(Schema) } })
 *                -> .parsed_output
 *   - OpenAI:    chat.completions.parse({ response_format: zodResponseFormat(Schema, name) })
 *                -> .choices[0].message.parsed
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const z = require("zod");
const Anthropic = require("@anthropic-ai/sdk");
const { zodOutputFormat } = require("@anthropic-ai/sdk/helpers/zod");
const OpenAI = require("openai");
const { zodResponseFormat } = require("openai/helpers/zod");

// The exact shape we want back. Field types and the enums are enforced.
const SupportTicket = z.object({
  summary: z.string(),
  category: z.enum(["BILLING", "BUG", "FEATURE"]),
  priority: z.enum(["low", "medium", "high"]),
  needs_human: z.boolean(),
});

const TEXT =
  "Subject: URGENT - double charged!! I've been billed twice for my annual plan " +
  "and need this refunded today, I'm furious.";
const INSTRUCTION = `Extract a structured support ticket from this message.\n\n${TEXT}`;

async function parseAnthropic() {
  const client = new Anthropic();
  const r = await client.messages.parse({
    model: process.env.ANTHROPIC_MODEL || "claude-opus-4-8",
    max_tokens: 512,
    messages: [{ role: "user", content: INSTRUCTION }],
    output_config: { format: zodOutputFormat(SupportTicket) },
  });
  return r.parsed_output;
}

async function parseOpenAI() {
  const client = new OpenAI();
  const r = await client.chat.completions.parse({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    max_tokens: 512,
    messages: [{ role: "user", content: INSTRUCTION }],
    response_format: zodResponseFormat(SupportTicket, "support_ticket"),
  });
  return r.choices[0].message.parsed;
}

function brief(err) {
  return `${err?.constructor?.name || "Error"}: ${String(err?.message || err).split("\n")[0].slice(0, 110)}`;
}

async function main() {
  const which = process.argv[2] || "both";
  for (const [provider, fn] of Object.entries({ anthropic: parseAnthropic, openai: parseOpenAI })) {
    if (which !== provider && which !== "both") continue;
    console.log(`\n=== ${provider} ===`);
    try {
      const ticket = await fn(); // already a validated object matching SupportTicket
      console.log(ticket);
      // Because it's a real object, your code can branch on it with confidence:
      if (ticket.needs_human && ticket.priority === "high") {
        console.log("  -> routing to a human agent immediately");
      }
    } catch (err) {
      // e.g. unfunded key -> 429 insufficient_quota
      console.log(`  [skipped — ${brief(err)}]`);
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { SupportTicket, parseAnthropic, parseOpenAI };
