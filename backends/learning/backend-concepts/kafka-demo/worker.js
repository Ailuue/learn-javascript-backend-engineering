/**
 * Order Processing Worker
 * ========================
 * Consumes "order.placed" events and processes them. Runs as a separate process
 * alongside the Express app. It belongs to the "order-processor" group, so you
 * can run multiple copies — Kafka splits partitions between them, scaling
 * throughput with no duplicate processing.
 *
 * At-least-once delivery: commits the offset only after successful processing
 * (autoCommit: false), so a crash mid-processing re-delivers the message on
 * restart. Make processing idempotent (e.g. check if order_id already exists
 * before charging) so reprocessing doesn't double-charge.
 *
 * Run:  node worker.js   (keep running while you POST to 05_express.js)
 */

const { kafka } = require("./kafka");

const TOPIC = "order.placed";
const GROUP_ID = "order-processor";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function processOrder(event) {
  console.log(`\n  ┌── Processing order ${event.order_id} for ${event.customer_id}`);
  console.log(`  │   item=${event.item}  qty=${event.quantity}`);

  if (!(event.quantity > 0 && event.item)) {
    console.log("  └── REJECTED: invalid order data");
    return;
  }
  console.log("  │   [1/3] validated ✓");
  await sleep(50); // simulate payment API
  console.log("  │   [2/3] payment charged ✓");
  await sleep(20); // simulate email service
  console.log("  │   [3/3] confirmation sent ✓");
  console.log(`  └── DONE  (${Date.now() - event.created_at}ms from event creation)`);
}

async function main() {
  console.log(`=== Order Worker ===\n    topic=${TOPIC}  group=${GROUP_ID}\n    Waiting for events... (Ctrl-C to stop)`);
  const consumer = kafka.consumer({ groupId: GROUP_ID });
  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC, fromBeginning: true });

  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ topic, partition, message }) => {
      try {
        await processOrder(JSON.parse(message.value));
      } catch (err) {
        // Production: route to a dead-letter topic instead of skipping.
        console.log(`  ERROR processing message: ${err.message}  (skipping)`);
      }
      await consumer.commitOffsets([{ topic, partition, offset: (Number(message.offset) + 1).toString() }]);
    },
  });

  process.on("SIGINT", async () => {
    console.log("\nShutting down gracefully...");
    await consumer.disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("ERROR (is Kafka running? docker compose up -d):", err.message);
  process.exit(1);
});
