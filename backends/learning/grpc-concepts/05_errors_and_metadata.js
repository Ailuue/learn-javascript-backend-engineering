/**
 * Concept 05 — Error Handling & Metadata
 *
 * ERRORS
 * ------
 * gRPC has its own status codes (grpc.status.*), separate from HTTP:
 *   OK, NOT_FOUND, INVALID_ARGUMENT, UNAUTHENTICATED, PERMISSION_DENIED,
 *   ALREADY_EXISTS, RESOURCE_EXHAUSTED, UNAVAILABLE, DEADLINE_EXCEEDED,
 *   INTERNAL, UNIMPLEMENTED.
 *
 *   Server returns an error: callback({ code: grpc.status.NOT_FOUND, details })
 *   Client catches it:        err.code (number), err.details (string)
 *
 * METADATA
 * --------
 * Metadata is key/value pairs sent alongside an RPC — gRPC's "headers". Used for
 * auth tokens, request IDs, tracing. Keys are lowercase ASCII; binary values use
 * a "-bin" suffix.
 *
 *   Client → Server:  pass a grpc.Metadata as the 2nd stub arg
 *   Server reads:     call.metadata.get("x-request-id")
 *   Server → Client:  call.sendMetadata(md)        (initial, before the body)
 *                     callback(null, reply, md)     (trailing, after the body)
 *   Client reads:     "metadata" event (initial), "status" event (trailing)
 *
 * HOW TO RUN:
 *   node 05_errors_and_metadata.js
 */

const grpc = require("@grpc/grpc-js");
const { loadProto } = require("./load");

const PORT = 50055;
const { Greeter } = loadProto("greeter.proto");

const KNOWN_USERS = {
  1: { id: 1, name: "Alex", email: "alex@example.com" },
  2: { id: 2, name: "Dana", email: "dana@example.com" },
};

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const handlers = {
  SayHello(call, callback) {
    const requestId = call.metadata.get("x-request-id")[0] || "unknown";
    const lang = call.metadata.get("accept-language")[0] || "en";
    console.log(`  [server] SayHello  request-id=${requestId}  lang=${lang}`);

    if (!call.request.name) {
      callback({ code: grpc.status.INVALID_ARGUMENT, details: "name must not be empty" });
      return;
    }

    const greeting = { en: "Hello", es: "Hola", fr: "Bonjour" }[lang] || "Hello";

    // Initial metadata is flushed to the client before the response body.
    const initial = new grpc.Metadata();
    initial.set("x-served-by", "greeter-server-1");
    initial.set("x-request-id", requestId); // echo it back
    call.sendMetadata(initial);

    // Trailing metadata rides along with the final status (like HTTP trailers).
    const trailing = new grpc.Metadata();
    trailing.set("x-processing-ms", "12");
    callback(null, { message: `${greeting}, ${call.request.name}!` }, trailing);
  },

  GetUser(call, callback) {
    const userId = call.request.userId;
    if (userId <= 0) {
      callback({ code: grpc.status.INVALID_ARGUMENT, details: `user_id must be positive, got ${userId}` });
      return;
    }
    const user = KNOWN_USERS[userId];
    if (!user) {
      callback({ code: grpc.status.NOT_FOUND, details: `user ${userId} does not exist` });
      return;
    }
    callback(null, user);
  },
};

function makeServer() {
  const server = new grpc.Server();
  server.addService(Greeter.service, handlers);
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
// Client helpers
// ---------------------------------------------------------------------------

// Call a unary method capturing the response plus both metadata channels.
function callWithMetadata(client, method, request, metadata, options = {}) {
  return new Promise((resolve, reject) => {
    let initialMetadata;
    const call = client[method](request, metadata, options, (err, response) =>
      err ? reject(err) : resolve({ response, initialMetadata, call })
    );
    call.on("metadata", (md) => {
      initialMetadata = md;
    });
  });
}

function printRpcError(e) {
  console.log(`   RpcError  code=${grpc.status[e.code]}  details=${JSON.stringify(e.details)}`);
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

async function runClient() {
  const client = new Greeter(`localhost:${PORT}`, grpc.credentials.createInsecure());

  console.log("\n1. SayHello with client metadata (request-id, language):");
  const md = new grpc.Metadata();
  md.set("x-request-id", "abc-123");
  md.set("accept-language", "es"); // server will greet in Spanish
  const { response, initialMetadata } = await callWithMetadata(client, "SayHello", { name: "Alex" }, md);
  console.log(`   reply: ${JSON.stringify(response.message)}`);
  console.log(`   initial metadata:  x-served-by=${initialMetadata.get("x-served-by")[0]}`);

  console.log("\n2. SayHello with empty name (expect INVALID_ARGUMENT):");
  try {
    await callWithMetadata(client, "SayHello", { name: "" }, new grpc.Metadata());
  } catch (e) {
    printRpcError(e);
  }

  console.log("\n3. GetUser for missing ID (expect NOT_FOUND):");
  try {
    await callWithMetadata(client, "GetUser", { userId: 99 }, new grpc.Metadata());
  } catch (e) {
    printRpcError(e);
  }

  console.log("\n4. GetUser with invalid ID (expect INVALID_ARGUMENT):");
  try {
    await callWithMetadata(client, "GetUser", { userId: -5 }, new grpc.Metadata());
  } catch (e) {
    printRpcError(e);
  }

  console.log("\n5. SayHello with impossibly tight deadline (expect DEADLINE_EXCEEDED):");
  try {
    await callWithMetadata(client, "SayHello", { name: "Timeout" }, new grpc.Metadata(), {
      deadline: Date.now() + 1,
    });
  } catch (e) {
    printRpcError(e);
  }

  console.log("\n6. GetUser (valid) after all the errors above:");
  const { response: user } = await callWithMetadata(client, "GetUser", { userId: 1 }, new grpc.Metadata());
  console.log(`   id=${user.id}  name=${JSON.stringify(user.name)}`);

  client.close();
}

async function main() {
  console.log("=".repeat(60));
  console.log("CONCEPT 05 — Error Handling & Metadata");
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
