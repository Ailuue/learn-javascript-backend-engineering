/**
 * Concept 03 — Client Streaming RPC
 *
 * The client sends MANY requests; the server reads them all, then sends ONE
 * response.
 *
 *   Client ── Chunk (×N) ──> Server  (accumulates)
 *   Client ──── EOF ───────> Server
 *   Client <── UploadResult ── Server
 *
 * Uses: chunked file upload, batch inserts, collecting readings before an
 * aggregate, audio/video pipelines.
 *
 * Server side: the handler is `(call, callback)`. `call` is a Readable of
 * incoming messages; you listen for "data" and "end", then `callback(null, result)`.
 * Client side: the stub call returns a Writable; you `call.write(chunk)` per
 * message and `call.end()`, and your callback fires with the single response.
 *
 * HOW TO RUN:
 *   node 03_client_streaming.js
 */

const grpc = require("@grpc/grpc-js");
const { loadProto } = require("./load");

const PORT = 50053;
const CHUNK_SIZE = 64 * 1024; // 64 KB per chunk
const { FileUpload } = loadProto("upload.proto");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const handlers = {
  UploadFile(call, callback) {
    let totalChunks = 0;
    let totalBytes = 0;
    let filename = null;

    call.on("data", (chunk) => {
      if (filename === null) filename = chunk.filename;
      totalChunks += 1;
      totalBytes += chunk.data.length;
      console.log(`  [server] Received chunk ${chunk.chunkIndex}: ${chunk.data.length} bytes`);
    });

    call.on("end", () => {
      console.log(`  [server] Upload complete: ${totalChunks} chunks, ${totalBytes} bytes`);
      callback(null, {
        filename: filename || "unknown",
        totalChunks,
        totalBytes,
        status: "ok",
      });
    });
  },
};

function makeServer() {
  const server = new grpc.Server();
  server.addService(FileUpload.service, handlers);
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

// Stream `data` to the server as a sequence of Chunk messages, then resolve with
// the server's single UploadResult.
function uploadFile(client, filename, data, chunkSize) {
  return new Promise((resolve, reject) => {
    const call = client.UploadFile((err, result) => (err ? reject(err) : resolve(result)));
    (async () => {
      let index = 0;
      for (let offset = 0; offset < data.length; offset += chunkSize) {
        call.write({ filename, data: data.subarray(offset, offset + chunkSize), chunkIndex: index });
        index += 1;
        await sleep(50); // simulate upload latency
      }
      call.end();
    })().catch(reject);
  });
}

async function runClient() {
  const client = new FileUpload(`localhost:${PORT}`, grpc.credentials.createInsecure());

  console.log("\n1. Upload a small file (fits in one chunk):");
  const small = Buffer.from("Hello, gRPC!".repeat(10));
  const r1 = await uploadFile(client, "hello.txt", small, CHUNK_SIZE);
  console.log(`   filename=${r1.filename}  chunks=${r1.totalChunks}  bytes=${r1.totalBytes}  status=${JSON.stringify(r1.status)}`);

  console.log("\n2. Upload a larger file (3 chunks of 64 KB each):");
  const large = Buffer.alloc(3 * CHUNK_SIZE, "x");
  const r2 = await uploadFile(client, "bigfile.bin", large, CHUNK_SIZE);
  console.log(`   filename=${r2.filename}  chunks=${r2.totalChunks}  bytes=${r2.totalBytes}  status=${JSON.stringify(r2.status)}`);

  console.log("\n3. Upload nothing (empty stream — edge case):");
  const r3 = await uploadFile(client, "empty", Buffer.alloc(0), CHUNK_SIZE);
  console.log(`   chunks=${r3.totalChunks}  bytes=${r3.totalBytes}  status=${JSON.stringify(r3.status)}`);

  client.close();
}

async function main() {
  console.log("=".repeat(60));
  console.log("CONCEPT 03 — Client Streaming RPC");
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
