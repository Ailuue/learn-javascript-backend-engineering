// Slug generation — the JS analog of shortener.py.

const crypto = require("crypto");

// 62 chars -> 62^7 ≈ 3.5 trillion combos
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const CODE_LENGTH = 7;

function generateShortCode() {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return code;
}

module.exports = { generateShortCode };
