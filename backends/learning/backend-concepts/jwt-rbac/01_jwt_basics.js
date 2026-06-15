/**
 * 01_jwt_basics.js — What a JWT Actually Is
 * ==========================================
 * A JWT is three base64url-encoded JSON blobs joined with dots:
 *
 *     HEADER.PAYLOAD.SIGNATURE
 *     Header    → {"alg":"HS256","typ":"JWT"}
 *     Payload   → {"sub":"user_42","role":"admin","exp":...}
 *     Signature → HMAC-SHA256(base64url(header) + "." + base64url(payload), secret)
 *
 * The header and payload are encoded, NOT encrypted — anyone can read them; they
 * just can't forge the signature without the secret. Never put secrets in the
 * payload. Any byte change breaks the signature (integrity).
 *
 * Standard claims: sub (subject), iat (issued at), exp (expiry), jti (token id).
 *
 * In Node the library is `jsonwebtoken`. Run:  node 01_jwt_basics.js
 */

const jwt = require("jsonwebtoken");

const SECRET = "dev-secret-key-minimum-32-bytes!!"; // HS256 wants ≥32 bytes

// Decode one base64url JWT part without verifying.
const decodePart = (b64) => JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));

function main() {
  // jsonwebtoken adds iat automatically and takes exp via expiresIn.
  const token = jwt.sign({ sub: "user_42", name: "Alex", role: "admin" }, SECRET, {
    algorithm: "HS256",
    expiresIn: "1h",
  });

  console.log("=== Encoded token ===");
  console.log(token);

  console.log("\n=== Decode the parts manually (no secret needed) ===");
  const [headerB64, payloadB64, sigB64] = token.split(".");
  console.log(`  Header  : ${JSON.stringify(decodePart(headerB64))}`);
  console.log(`  Payload : ${JSON.stringify(decodePart(payloadB64))}`);
  console.log(`  Sig     : ${sigB64.slice(0, 20)}…  (can't forge this without the secret)`);

  console.log("\n=== Verify a valid token ===");
  console.log(`  OK: ${JSON.stringify(jwt.verify(token, SECRET))}`);

  console.log("\n=== Tampered payload (role changed to 'superadmin') ===");
  const evil = decodePart(payloadB64);
  evil.role = "superadmin";
  const evilB64 = Buffer.from(JSON.stringify(evil)).toString("base64url");
  try {
    jwt.verify(`${headerB64}.${evilB64}.${sigB64}`, SECRET);
    console.log("  Verified (should never happen)");
  } catch (err) {
    console.log(`  REJECTED — ${err.message}`);
  }

  console.log("\n=== Expired token ===");
  const expired = jwt.sign({ sub: "user_42" }, SECRET, { expiresIn: -10 });
  try {
    jwt.verify(expired, SECRET);
    console.log("  Verified (should never happen)");
  } catch (err) {
    console.log(`  REJECTED — ${err.message}`);
  }

  console.log("\n=== Valid token verified with the wrong secret ===");
  try {
    jwt.verify(token, "wrong-secret-key-minimum-32-bytes!!");
    console.log("  Verified (should never happen)");
  } catch (err) {
    console.log(`  REJECTED — ${err.message}`);
  }
}

if (require.main === module) main();

module.exports = { decodePart, SECRET };
