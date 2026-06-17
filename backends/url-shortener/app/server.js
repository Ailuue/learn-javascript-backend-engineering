// Network entry point — opens the Redis cache connection at startup
// (`cache.init()`) then listens. Schema is managed by Prisma Migrate: run
// `npx prisma migrate deploy` before starting.

const app = require("./main");
const cache = require("./cache");
const prisma = require("./database");

const PORT = Number(process.env.PORT || 8000);

async function main() {
  await cache.init();
  const server = app.listen(PORT, () => {
    console.log(`URL shortener API listening on port ${PORT}`);
  });

  const shutdown = async () => {
    server.close();
    await cache.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main();
