// Jest globalSetup — creates the SQLite test schema once before the suite runs,
// the JS analog of conftest.py building tables on a temp SQLite engine. It runs
// `prisma db push` against a throwaway test.db so every test worker can open it.

const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SCHEMA = path.join(PROJECT_ROOT, "prisma", "schema.prisma");
const DB_PATH = path.join(PROJECT_ROOT, "prisma", "test.db");

module.exports = async () => {
  fs.rmSync(DB_PATH, { force: true });
  execFileSync(
    "npx",
    ["prisma", "db", "push", `--schema=${SCHEMA}`, "--skip-generate", "--accept-data-loss"],
    {
      cwd: PROJECT_ROOT,
      env: { ...process.env, DATABASE_URL: `file:${DB_PATH}` },
      stdio: "ignore",
    }
  );
};
