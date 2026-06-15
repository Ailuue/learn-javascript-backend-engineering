/**
 * Concept 04 — Bidirectional Streaming RPC
 *
 * Both sides send multiple messages independently over one persistent
 * connection. Neither side waits for the other before sending.
 *
 *   Client ── ChatMessage ──> Server
 *   Client <── [echo] ─────── Server
 *   Client ── ChatMessage ──> Server
 *   Client <── [echo] ─────── Server   …
 *
 * Uses: chat/messaging, collaborative editing, two-way telemetry, game state.
 *
 * Server side: `call` is both Readable and Writable. Listen for "data" to read,
 * `call.write()` to reply, `call.end()` on "end" to signal EOF.
 * Client side: the stub call returns the same duplex stream — write outbound
 * messages and listen for inbound ones concurrently.
 *
 * In this demo the server echoes every message with an "[echo]" prefix.
 *
 * HOW TO RUN:
 *   node 04_bidirectional_streaming.js
 */

const grpc = require("@grpc/grpc-js");
const { loadProto } = require("./load");

const PORT = 50054;
const { Chat } = loadProto("chat.proto");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Server — echo each inbound message; end when the client ends.
// ---------------------------------------------------------------------------

const handlers = {
  Connect(call) {
    call.on("data", (msg) => {
      console.log(`  [server] received from ${JSON.stringify(msg.user)}: ${JSON.stringify(msg.text)}`);
      call.write({ user: "server", text: `[echo] ${msg.text}`, timestamp: Date.now() });
    });
    call.on("end", () => call.end());
  },
};

function makeServer() {
  const server = new grpc.Server();
  server.addService(Chat.service, handlers);
  return server;
}

function startServer(server) {
  return new Promise((resolve, reject) => {
    server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err) =>
      err ? reject(err) : resolve()
    );
  });
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const MESSAGES = [
  "hello there",
  "how are you?",
  "what's the weather like?",
  "tell me a joke",
  "goodbye!",
];

// Send each message with a small gap, while a "data" listener reads echoes
// concurrently — the two directions are independent.
async function sendMessages(call, user, messages) {
  for (const text of messages) {
    console.log(`  [client] sending: ${JSON.stringify(text)}`);
    call.write({ user, text, timestamp: Date.now() });
    await sleep(300);
  }
  call.end();
}

async function runClient() {
  const client = new Chat(`localhost:${PORT}`, grpc.credentials.createInsecure());

  console.log("\n1. Full bidirectional chat (5 messages, each echoed back):");
  await new Promise((resolve, reject) => {
    const call = client.Connect();
    call.on("data", (reply) =>
      console.log(`  [client] received from ${JSON.stringify(reply.user)}: ${JSON.stringify(reply.text)}`)
    );
    call.on("end", resolve);
    call.on("error", reject);
    sendMessages(call, "alex", MESSAGES).catch(reject);
  });

  console.log("\n2. Client disconnects after receiving 2 replies:");
  await new Promise((resolve, reject) => {
    const call = client.Connect();
    let received = 0;
    call.on("data", (reply) => {
      console.log(`  [client] received: ${JSON.stringify(reply.text)}`);
      received += 1;
      if (received === 2) {
        call.cancel();
        console.log("  [client] cancelled stream");
        resolve();
      }
    });
    call.on("end", resolve);
    // After a client cancel, the stream emits a CANCELLED error — expected here.
    call.on("error", (err) => (err.code === grpc.status.CANCELLED ? resolve() : reject(err)));
    sendMessages(call, "alex", ["msg1", "msg2", "msg3", "msg4"]).catch(() => {});
  });

  client.close();
}

async function main() {
  console.log("=".repeat(60));
  console.log("CONCEPT 04 — Bidirectional Streaming RPC");
  console.log("=".repeat(60));

  const server = makeServer();
  await startServer(server);
  try {
    await runClient();
  } finally {
    server.forceShutdown();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { makeServer, PORT };
