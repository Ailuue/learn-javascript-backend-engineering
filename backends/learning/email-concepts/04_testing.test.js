/**
 * Concept 04 — Testing Email
 *
 * Two complementary strategies for testing email:
 *
 *   UNIT TESTS — use a fake transport so nothing hits the network. nodemailer
 *     ships `jsonTransport: true`, which serialises the message instead of
 *     sending it. Fast, isolated, CI-friendly. Assert the message was built
 *     correctly (recipient, subject, parts).
 *
 *   INTEGRATION TESTS — send to Mailpit and query its HTTP API to assert
 *     receipt. Catches real rendering/delivery bugs. Requires Docker, so they're
 *     gated behind MAILPIT=1 and skipped in normal `npm test` runs.
 *
 * Unit tests verify your *code*; integration tests verify the *email* end-to-end.
 *
 * HOW TO RUN:
 *   npm test                                  # unit tests only
 *   docker compose up -d && MAILPIT=1 npm test -- email-concepts   # + integration
 */

const nodemailer = require("nodemailer");

const MAILPIT_API = "http://localhost:8025/api/v1";

// ---------------------------------------------------------------------------
// Application code under test. The transport is injected so the same functions
// run against the JSON transport in unit tests and against Mailpit in
// integration tests — dependency inversion, no mocking required.
// ---------------------------------------------------------------------------

async function sendWelcomeEmail(transport, to, name) {
  return transport.sendMail({
    from: { name: "My App", address: "app@example.com" },
    to,
    subject: `Welcome to My App, ${name}!`,
    text: `Hi ${name}, thanks for signing up!`,
    html: `<h1>Hi ${name}!</h1><p>Thanks for signing up!</p>`,
  });
}

async function sendPasswordReset(transport, to, token) {
  return transport.sendMail({
    from: "app@example.com",
    to,
    subject: "Reset your password",
    text: `Your reset link: https://example.com/reset?token=${token}`,
  });
}

// `jsonTransport` serialises each message to JSON on `info.message` instead of
// sending it — the cleanest fake for unit tests.
function parseSent(info) {
  return JSON.parse(info.message);
}

// ---------------------------------------------------------------------------
// UNIT TESTS — JSON transport, no network
// ---------------------------------------------------------------------------

describe("sendWelcomeEmail (unit)", () => {
  const transport = nodemailer.createTransport({ jsonTransport: true });

  test("addresses the message to the given recipient", async () => {
    const info = await sendWelcomeEmail(transport, "alex@example.com", "Alex");
    const msg = parseSent(info);
    expect(msg.to[0].address).toBe("alex@example.com");
  });

  test("subject contains the recipient's name", async () => {
    const info = await sendWelcomeEmail(transport, "x@example.com", "Dana");
    expect(parseSent(info).subject).toContain("Dana");
  });

  test("includes an HTML part", async () => {
    const info = await sendWelcomeEmail(transport, "x@example.com", "Jordan");
    expect(parseSent(info).html).toContain("<h1>");
  });
});

describe("sendPasswordReset (unit)", () => {
  const transport = nodemailer.createTransport({ jsonTransport: true });

  test("reset link with token is in the body", async () => {
    const info = await sendPasswordReset(transport, "user@example.com", "tok_secret_xyz");
    const msg = parseSent(info);
    expect(msg.text).toContain("tok_secret_xyz");
    expect(msg.text).toContain("https://example.com/reset");
  });

  test("has the expected subject line", async () => {
    const info = await sendPasswordReset(transport, "user@example.com", "tok");
    expect(parseSent(info).subject).toBe("Reset your password");
  });
});

// ---------------------------------------------------------------------------
// INTEGRATION TESTS — send to Mailpit, query its API. Gated behind MAILPIT=1.
// ---------------------------------------------------------------------------

const integration = process.env.MAILPIT ? describe : describe.skip;

integration("sendWelcomeEmail (integration, Mailpit)", () => {
  const transport = nodemailer.createTransport({ host: "localhost", port: 1025, secure: false });

  beforeEach(async () => {
    await fetch(`${MAILPIT_API}/messages`, { method: "DELETE" });
  });

  test("email arrives in Mailpit", async () => {
    await sendWelcomeEmail(transport, "alex@example.com", "Alex");
    const data = await fetch(`${MAILPIT_API}/messages`).then((r) => r.json());
    expect(data.total).toBe(1);
    expect(data.messages[0].To[0].Address).toBe("alex@example.com");
    expect(data.messages[0].Subject).toContain("Welcome");
  });

  test("both HTML and text parts are delivered", async () => {
    await sendWelcomeEmail(transport, "test@example.com", "Tester");
    const list = await fetch(`${MAILPIT_API}/messages`).then((r) => r.json());
    const full = await fetch(`${MAILPIT_API}/message/${list.messages[0].ID}`).then((r) => r.json());
    expect(full.HTML).toBeTruthy();
    expect(full.Text).toBeTruthy();
  });
});

module.exports = { sendWelcomeEmail, sendPasswordReset };
