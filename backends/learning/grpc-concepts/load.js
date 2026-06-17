// Shared proto loader.
//
// There is **no codegen step**. The idiomatic 2026 approach is
// `@grpc/proto-loader`, which parses the .proto at runtime and hands back the
// service/message definitions directly. Edit the .proto, restart — no build
// script, no generated files to gitignore.
//
// (A codegen path exists too — `grpc-tools` + `ts-proto` for typed stubs — but
// dynamic loading is the simplest and most common choice for plain JS.)

const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

// Options chosen to match protobuf's defaults closely:
//   keepCase: false    → snake_case proto fields become camelCase in JS (user_id → userId)
//   longs: Number      → int64 fields come back as JS numbers (fine for timestamps here)
//   defaults: true     → unset fields get their proto3 zero value
const LOAD_OPTIONS = {
  keepCase: false,
  longs: Number,
  enums: String,
  defaults: true,
  oneofs: true,
};

function loadProto(file) {
  const packageDefinition = protoLoader.loadSync(
    path.join(__dirname, "proto", file),
    LOAD_OPTIONS
  );
  return grpc.loadPackageDefinition(packageDefinition);
}

module.exports = { loadProto };
