/**
 * Concept 06 — Interceptors (Middleware)
 *
 * Interceptors are middleware that wrap every RPC on a server or client. They
 * add cross-cutting concerns — logging, auth, tracing, metrics — without
 * touching each method's business logic.
 *
 *   SERVER interceptors wrap incoming RPCs before they reach the handler:
 *     inspect/modify metadata, abort early (auth), time the call.
 *   CLIENT interceptors wrap outgoing RPCs before they leave:
 *     inject auth headers, add tracing IDs, retry.
 *
 * grpc-js shapes these differently from Python:
 *   - A client interceptor is `(options, nextCall) => new InterceptingCall(...)`
 *     with a `start(metadata, listener, next)` hook to mutate outbound metadata.
 *   - A server interceptor is `(methodDescriptor, call) => new
 *     ServerInterceptingCall(call, responders)`. The `start` responder builds a
 *     listener; `withOnReceiveMetadata` is where you read auth metadata and can
 *     short-circuit with `call.sendStatus(...)`.
 *
 * HOW TO RUN:
 *   node 06_interceptors.js
 */

const grpc = require("@grpc/grpc-js");
const { loadProto } = require("./load");

const PORT = 50056;
const VALID_TOKEN = "secret-token-abc";
const { Greeter } = loadProto("greeter.proto");

// ---------------------------------------------------------------------------
// Server interceptor 1 — logging (method name + duration + status)
// ---------------------------------------------------------------------------

function loggingInterceptor(methodDescriptor, call) {
  const start = process.hrtime.bigint();
  return new grpc.ServerInterceptingCall(call, {
    sendStatus(status, next) {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      const label = status.code === grpc.status.OK ? "OK" : `ERR(${grpc.status[status.code]})`;
      console.log(`  [log] ${methodDescriptor.path}  ${label}  ${ms.toFixed(1)}ms`);
      next(status);
    },
  });
}

// ---------------------------------------------------------------------------
// Server interceptor 2 — auth token check
// ---------------------------------------------------------------------------

function authInterceptor(methodDescriptor, call) {
  return new grpc.ServerInterceptingCall(call, {
    start(next) {
      const listener = new grpc.ServerListenerBuilder()
        .withOnReceiveMetadata((metadata, mdNext) => {
          const token = metadata.get("authorization")[0] || "";
          if (token !== VALID_TOKEN) {
            console.log(`  [auth] REJECTED  token=${JSON.stringify(token)}`);
            // Short-circuit: send the status and never forward to the handler.
            call.sendStatus({
              code: grpc.status.UNAUTHENTICATED,
              details: "Invalid or missing token",
              metadata: new grpc.Metadata(),
            });
            return;
          }
          console.log(`  [auth] ACCEPTED  token=${JSON.stringify(token)}`);
          mdNext(metadata);
        })
        .build();
      next(listener);
    },
  });
}

// ---------------------------------------------------------------------------
// Client interceptor — inject the auth token on every outgoing call
// ---------------------------------------------------------------------------

function tokenInjector(options, nextCall) {
  return new grpc.InterceptingCall(nextCall(options), {
    start(metadata, listener, next) {
      metadata.add("authorization", VALID_TOKEN);
      next(metadata, listener);
    },
  });
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

const handlers = {
  SayHello(call, callback) {
    callback(null, { message: `Hello, ${call.request.name}!` });
  },
  GetUser(call, callback) {
    const users = { 1: { id: 1, name: "Alex", email: "alex@example.com" } };
    const user = users[call.request.userId];
    if (!user) {
      callback({ code: grpc.status.NOT_FOUND, details: `User ${call.request.userId} not found` });
      return;
    }
    callback(null, user);
  },
};

function makeServer() {
  // Interceptors compose in array order: auth runs before logging.
  const server = new grpc.Server({ interceptors: [authInterceptor, loggingInterceptor] });
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
// Demo
// ---------------------------------------------------------------------------

function sayHello(client, name, metadata = new grpc.Metadata()) {
  return new Promise((resolve, reject) => {
    client.SayHello({ name }, metadata, (err, res) => (err ? reject(err) : resolve(res)));
  });
}

function getUser(client, userId) {
  return new Promise((resolve, reject) => {
    client.GetUser({ userId }, (err, res) => (err ? reject(err) : resolve(res)));
  });
}

async function runClient() {
  const addr = `localhost:${PORT}`;
  const creds = grpc.credentials.createInsecure();

  console.log("\n1. Call without auth token (expect UNAUTHENTICATED):");
  const plain = new Greeter(addr, creds);
  try {
    await sayHello(plain, "Alex");
  } catch (e) {
    console.log(`   ${grpc.status[e.code]}: ${e.details}`);
  }

  console.log("\n2. Call with wrong token (expect UNAUTHENTICATED):");
  try {
    const md = new grpc.Metadata();
    md.set("authorization", "wrong-token");
    await sayHello(plain, "Alex", md);
  } catch (e) {
    console.log(`   ${grpc.status[e.code]}: ${e.details}`);
  }

  console.log("\n3. Call with correct token (manually):");
  const md = new grpc.Metadata();
  md.set("authorization", VALID_TOKEN);
  console.log(`   ${JSON.stringify((await sayHello(plain, "Alex", md)).message)}`);
  plain.close();

  console.log("\n4. Using a client interceptor — token injected automatically:");
  const authed = new Greeter(addr, creds, { interceptors: [tokenInjector] });
  console.log(`   ${JSON.stringify((await sayHello(authed, "Dana")).message)}`);
  const user = await getUser(authed, 1);
  console.log(`   GetUser → id=${user.id}  name=${JSON.stringify(user.name)}`);
  authed.close();
}

async function main() {
  console.log("=".repeat(60));
  console.log("CONCEPT 06 — Interceptors");
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
