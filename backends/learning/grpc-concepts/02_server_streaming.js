/**
 * Concept 02 — Server Streaming RPC
 *
 * The client sends ONE request; the server sends MANY responses over time,
 * keeping the connection open until it's done (or the client cancels).
 *
 *   Client ── SubscribeRequest ──> Server
 *   Client <── PriceUpdate (×N) ── Server
 *   Client <──────── EOF ──────── Server
 *
 * Uses: live price/metric feeds, log tailing, large result sets, progress.
 *
 * Server side: the handler gets a writable `call`. You `call.write(msg)` for each
 * message and `call.end()` to finish.
 * Client side: the stub call returns a Readable stream — listen for "data",
 * "end", and "error".
 *
 * HOW TO RUN:
 *   node 02_server_streaming.js
 */

const grpc = require("@grpc/grpc-js");
const { loadProto } = require("./load");

const PORT = 50052;
const { StockTicker } = loadProto("stock.proto");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const handlers = {
  async StreamPrices(call) {
    const { symbol, count } = call.request;
    console.log(`  [server] Streaming ${count} prices for ${JSON.stringify(symbol)}`);
    const basePrice = { AAPL: 189.5, GOOG: 175.2, TSLA: 245.0 }[symbol] ?? 100.0;

    // `cancelled` flips to true when the client cancels — stop generating then.
    let cancelled = false;
    call.on("cancelled", () => {
      cancelled = true;
      console.log("  [server] Client cancelled, stopping stream.");
    });

    for (let i = 0; i < count; i += 1) {
      if (cancelled) return;
      const price = Number((basePrice + (Math.random() * 4 - 2)).toFixed(2));
      call.write({ symbol, price, timestamp: Date.now() });
      await sleep(200); // simulate real-time cadence
    }
    call.end();
  },
};

function makeServer() {
  const server = new grpc.Server();
  server.addService(StockTicker.service, handlers);
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
// Client — wrap each readable stream in a promise so the demo reads linearly.
// ---------------------------------------------------------------------------

function consume(stream, { onData, stopAfter, deadlineError }) {
  return new Promise((resolve, reject) => {
    let received = 0;
    stream.on("data", (update) => {
      onData(update);
      received += 1;
      if (stopAfter && received === stopAfter) {
        stream.cancel(); // close the stream from the client side
        resolve(received);
      }
    });
    stream.on("end", () => resolve(received));
    stream.on("error", (err) => (deadlineError ? deadlineError(err, resolve) : reject(err)));
  });
}

async function runClient() {
  const client = new StockTicker(`localhost:${PORT}`, grpc.credentials.createInsecure());

  console.log("\n1. Stream 5 AAPL price updates:");
  await consume(client.StreamPrices({ symbol: "AAPL", count: 5 }), {
    onData: (u) => console.log(`   ${u.symbol}  $${u.price.toFixed(2)}  ts=${u.timestamp}`),
  });

  console.log("\n2. Stream 10 GOOG updates but cancel after 3:");
  await consume(client.StreamPrices({ symbol: "GOOG", count: 10 }), {
    onData: (u) => console.log(`   ${u.symbol}  $${u.price.toFixed(2)}`),
    stopAfter: 3,
  });
  console.log("   (cancelled by client)");

  console.log("\n3. Stream with a 0.5s deadline (expect DEADLINE_EXCEEDED):");
  const slow = client.StreamPrices({ symbol: "TSLA", count: 100 }, { deadline: Date.now() + 500 });
  await consume(slow, {
    onData: (u) => console.log(`   ${u.symbol}  $${u.price.toFixed(2)}`),
    deadlineError: (err, resolve) => {
      console.log(`   Timed out: ${grpc.status[err.code]}`);
      resolve();
    },
  });

  client.close();
}

async function main() {
  console.log("=".repeat(60));
  console.log("CONCEPT 02 — Server Streaming RPC");
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
