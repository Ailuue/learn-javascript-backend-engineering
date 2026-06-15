/**
 * Concept 01 — Unary RPC
 *
 * gRPC is a high-performance RPC framework built on HTTP/2 and Protocol Buffers.
 * Instead of routes and JSON, you define services and messages in a .proto
 * schema and call generated methods directly.
 *
 * UNARY RPC — the simplest pattern: one request → one response.
 *
 *   REST:  POST /users {"name":"Alex"} → 200 {"id":1,"name":"Alex"}
 *   gRPC:  SayHello({name:"Alex"})      → {message:"Hello, Alex!"}
 *
 * In Node we load greeter.proto at runtime (see load.js — no codegen). That
 * gives us:
 *   proto.Greeter           — client constructor + `.service` definition
 *   proto.Greeter.service   — pass to server.addService with your handlers
 *
 * Handlers are `(call, callback)` functions: `call.request` is the message,
 * `callback(err, reply)` returns the response. Field names are camelCased by the
 * loader (proto `user_id` → `call.request.userId`).
 *
 * HOW TO RUN:
 *   npm install        (from the repo root)
 *   node 01_unary.js
 */

const grpc = require("@grpc/grpc-js");
const { loadProto } = require("./load");
const { promisify } = require("util");

const PORT = 50051;
const { Greeter } = loadProto("greeter.proto");

// ---------------------------------------------------------------------------
// Server implementation — one handler per RPC method.
// ---------------------------------------------------------------------------

const handlers = {
  SayHello(call, callback) {
    console.log(`  [server] SayHello called: name=${JSON.stringify(call.request.name)}`);
    callback(null, { message: `Hello, ${call.request.name}!` });
  },

  GetUser(call, callback) {
    const userId = call.request.userId;
    console.log(`  [server] GetUser called: userId=${userId}`);
    const users = {
      1: { id: 1, name: "Alex", email: "alex@example.com" },
      2: { id: 2, name: "Dana", email: "dana@example.com" },
    };
    if (!users[userId]) {
      // Return an error by passing a { code, details } object — the analog of
      // Python's context.abort(StatusCode.NOT_FOUND, ...).
      callback({ code: grpc.status.NOT_FOUND, details: `User ${userId} not found` });
      return;
    }
    callback(null, users[userId]);
  },
};

function makeServer() {
  const server = new grpc.Server();
  server.addService(Greeter.service, handlers);
  return server;
}

// bindAsync replaces Python's add_insecure_port + start; it's promise-friendly.
function startServer(server) {
  return new Promise((resolve, reject) => {
    server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err) =>
      err ? reject(err) : resolve()
    );
  });
}

// ---------------------------------------------------------------------------
// Client calls
// ---------------------------------------------------------------------------

async function runClient() {
  // A client (stub) is the connection handle. createInsecure = no TLS (dev only).
  const client = new Greeter(`localhost:${PORT}`, grpc.credentials.createInsecure());
  // Callback-style stubs promisify cleanly for async/await.
  const sayHello = promisify(client.SayHello).bind(client);
  const getUser = promisify(client.GetUser).bind(client);

  console.log("\n1. SayHello:");
  const reply = await sayHello({ name: "Alex" });
  console.log(`   reply.message = ${JSON.stringify(reply.message)}`);

  console.log("\n2. GetUser (existing user):");
  const user = await getUser({ userId: 1 });
  console.log(`   id=${user.id}  name=${JSON.stringify(user.name)}  email=${JSON.stringify(user.email)}`);

  console.log("\n3. GetUser (missing user — expect NOT_FOUND):");
  try {
    await getUser({ userId: 99 });
  } catch (e) {
    console.log(`   status code:    ${grpc.status[e.code]} (${e.code})`);
    console.log(`   status details: ${e.details}`);
  }

  console.log("\n4. SayHello with a tight deadline (expect DEADLINE_EXCEEDED):");
  try {
    // A deadline is an absolute time. 1ms from now will almost certainly expire.
    await new Promise((resolve, reject) => {
      client.SayHello({ name: "Timeout Test" }, { deadline: Date.now() + 1 }, (err, res) =>
        err ? reject(err) : resolve(res)
      );
    });
  } catch (e) {
    console.log(`   status code:    ${grpc.status[e.code]} (${e.code})`);
  }

  client.close();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(60));
  console.log("CONCEPT 01 — Unary RPC");
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
