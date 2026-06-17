// Minimal structured-ish logger. Node has no stdlib logging module, so we expose
// a tiny console wrapper with a "timestamp | LEVEL | message" shape and a level
// threshold.

const { getSettings } = require("./config");

const LEVELS = { DEBUG: 10, INFO: 20, WARNING: 30, ERROR: 40 };

function timestamp() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function makeLogger(name) {
  const threshold = LEVELS[getSettings().logLevel] || LEVELS.INFO;

  function emit(level, stream, message, ...args) {
    if (LEVELS[level] < threshold) return;
    const line = `${timestamp()} | ${level.padEnd(8)} | ${name} | ${message}`;
    stream(args.length ? `${line} ${args.join(" ")}` : line);
  }

  return {
    info: (msg, ...a) => emit("INFO", console.log, msg, ...a),
    warning: (msg, ...a) => emit("WARNING", console.warn, msg, ...a),
    error: (msg, ...a) => emit("ERROR", console.error, msg, ...a),
  };
}

module.exports = { makeLogger };
