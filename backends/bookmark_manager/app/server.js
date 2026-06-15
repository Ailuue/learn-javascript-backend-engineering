// Network entry point — the JS analog of running `uvicorn app.main:app`.
// Schema is managed by Prisma Migrate: `npx prisma migrate deploy` before start.

const app = require("./main");
const { makeLogger } = require("./logging_config");

const logger = makeLogger("app.server");
const PORT = Number(process.env.PORT || 8000);

app.listen(PORT, () => {
  logger.info(`Bookmark manager API listening on port ${PORT}`);
});
