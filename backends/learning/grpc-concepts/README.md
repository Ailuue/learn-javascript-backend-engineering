# gRPC Deep Dive (Node)

Remote procedure calls with Protocol Buffers and gRPC, using **@grpc/grpc-js**
(pure-JS implementation) and **@grpc/proto-loader** (runtime .proto loading).

## What is gRPC?

gRPC lets you call functions on a remote server as if they were local — no JSON,
no URL design, no status-code mapping. You define your API in a `.proto` schema
and call methods directly. Under the hood: **HTTP/2** (multiplexing, header
compression) and **Protocol Buffers** (compact, schema-validated binary).

## No codegen step

The biggest difference from Python: there's **no `protoc` build step**. Python
runs `grpc_tools.protoc` to generate `*_pb2.py` files. Here, `@grpc/proto-loader`
parses the `.proto` at runtime (see [load.js](load.js)) and hands back the
service constructors and message shapes directly. Edit a `.proto`, restart — done.

## The 4 RPC patterns

```
Unary              Client ──req──> Server ──res──> Client
Server streaming   Client ──req──> Server ──res1──res2──res3──> Client
Client streaming   Client ──req1──req2──req3──> Server ──res──> Client
Bidirectional      Client <──req1──res1──req2──res2──> Server
```

## Layout

```
grpc-concepts/
  proto/                  ← .proto schemas (edit these)
    greeter.proto         → used by 01, 05, 06
    stock.proto           → 02
    upload.proto          → 03
    chat.proto            → 04
  load.js                 ← runtime proto loader (replaces generate_protos.sh)
  01_unary.js … 06_interceptors.js
```

## Setup & running

```bash
npm install        # from the repo root
node 01_unary.js   # each file is self-contained: starts a server, runs a client, exits
```

| File | Pattern | What you'll learn |
|------|---------|-------------------|
| [01_unary.js](01_unary.js) | Unary | service/handlers, client stub, `callback` errors, deadlines |
| [02_server_streaming.js](02_server_streaming.js) | Server stream | `call.write`/`call.end`, readable stream, `cancel`, deadline |
| [03_client_streaming.js](03_client_streaming.js) | Client stream | writable stub, server accumulates, single response |
| [04_bidirectional_streaming.js](04_bidirectional_streaming.js) | Bidi stream | duplex stream, concurrent read/write, client cancel |
| [05_errors_and_metadata.js](05_errors_and_metadata.js) | Unary | `grpc.status`, `grpc.Metadata`, initial vs trailing metadata |
| [06_interceptors.js](06_interceptors.js) | Unary | server auth + logging interceptors, client token injection |

## Python → JS cheat sheet

| Python (grpcio) | JS (@grpc/grpc-js) |
|-----------------|--------------------|
| `grpc_tools.protoc` codegen | `protoLoader.loadSync` (runtime, no codegen) |
| `class Servicer:` methods | `server.addService(svc, { Method(call, cb) {} })` |
| `return Reply(...)` | `callback(null, { ... })` |
| `context.abort(code, msg)` | `callback({ code, details })` |
| `yield msg` (server stream) | `call.write(msg)` + `call.end()` |
| `request_iterator` (client stream) | `call.on("data" / "end")` |
| `timeout=0.5` | `{ deadline: Date.now() + 500 }` |
| `metadata=[("k","v")]` | `grpc.Metadata` + `md.set("k","v")` |
| `context.send_initial_metadata` | `call.sendMetadata(md)` |
| `context.set_trailing_metadata` | `callback(null, reply, trailingMd)` |
| `grpc.ServerInterceptor` | `(methodDescriptor, call) => new ServerInterceptingCall(...)` |
| `grpc.UnaryUnaryClientInterceptor` | `(options, nextCall) => new InterceptingCall(...)` |
