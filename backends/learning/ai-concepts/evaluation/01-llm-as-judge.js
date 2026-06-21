/**
 * LLM-as-judge: use a model to grade another model's answer.
 *
 * Run: `node 01-llm-as-judge.js [anthropic|openai]`
 *
 * When "correct" is fuzzy, a second model call can grade the first against a rubric.
 * We give the judge a question, a candidate answer, and explicit criteria, and ask
 * for a STRUCTURED verdict (pass/fail, 1-5 score, one-line reason) using the
 * schema-enforced parsing from ../structured-outputs/. A structured verdict is what
 * makes the judge usable in an automated harness — you can branch and aggregate on
 * it.
 *
 * We grade two candidates: one good, one that's confidently wrong, so you can see the
 * judge separate them. (Judges aren't perfect — they're a scalable approximation of
 * human review, not ground truth.)
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const z = require("zod");
const Anthropic = require("@anthropic-ai/sdk");
const { zodOutputFormat } = require("@anthropic-ai/sdk/helpers/zod");
const OpenAI = require("openai");
const { zodResponseFormat } = require("openai/helpers/zod");

const Verdict = z.object({
  passed: z.boolean(),
  score: z.number().int().min(1).max(5).describe("1=terrible, 5=excellent"),
  reason: z.string(),
});

const QUESTION = "What does the SQL keyword JOIN do?";
const CANDIDATES = {
  good: "JOIN combines rows from two or more tables based on a related column between them.",
  wrong: "JOIN permanently merges two tables into one and deletes the originals.",
};

function judgePrompt(answer) {
  return (
    "You are grading an answer for factual correctness and clarity.\n" +
    `Question: ${QUESTION}\n` +
    `Answer to grade: ${answer}\n\n` +
    "Pass only if the answer is factually correct. Give a 1-5 score and a brief reason."
  );
}

async function judgeAnthropic(answer) {
  const client = new Anthropic();
  const r = await client.messages.parse({
    model: process.env.ANTHROPIC_MODEL || "claude-opus-4-8",
    max_tokens: 512,
    messages: [{ role: "user", content: judgePrompt(answer) }],
    output_config: { format: zodOutputFormat(Verdict) },
  });
  return r.parsed_output;
}

async function judgeOpenAI(answer) {
  const client = new OpenAI();
  const r = await client.chat.completions.parse({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    max_tokens: 512,
    messages: [{ role: "user", content: judgePrompt(answer) }],
    response_format: zodResponseFormat(Verdict, "verdict"),
  });
  return r.choices[0].message.parsed;
}

function brief(err) {
  return `${err?.constructor?.name || "Error"}: ${String(err?.message || err).split("\n")[0].slice(0, 110)}`;
}

async function main() {
  const which = process.argv[2] || "both";
  const judges = { anthropic: judgeAnthropic, openai: judgeOpenAI };
  for (const [provider, judge] of Object.entries(judges)) {
    if (which !== provider && which !== "both") continue;
    console.log(`\n=== judge: ${provider} ===`);
    try {
      for (const [label, answer] of Object.entries(CANDIDATES)) {
        const v = await judge(answer);
        const mark = v.passed ? "PASS" : "FAIL";
        console.log(`  [${label.padStart(5)}] ${mark} score=${v.score} — ${v.reason}`);
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

module.exports = { Verdict, judgeAnthropic, judgeOpenAI };
