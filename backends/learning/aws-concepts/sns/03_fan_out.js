const { SNSClient, CreateTopicCommand, SubscribeCommand, PublishCommand, DeleteTopicCommand } = require("@aws-sdk/client-sns");
const {
  SQSClient,
  CreateQueueCommand,
  GetQueueAttributesCommand,
  SetQueueAttributesCommand,
  ReceiveMessageCommand,
  DeleteQueueCommand,
} = require("@aws-sdk/client-sqs");
const { config } = require("../helpers");

const sns = new SNSClient(config);
const sqs = new SQSClient(config);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Fan-out: one "order.placed" event → billing AND inventory queues at once. Each
// service owns its queue and processes independently — total decoupling.
async function main() {
  console.log("=== Fan-out: SNS topic → multiple SQS queues ===\n");

  const { TopicArn: topicArn } = await sns.send(new CreateTopicCommand({ Name: "order-events" }));

  const makeQueue = async (name) => {
    const { QueueUrl } = await sqs.send(new CreateQueueCommand({ QueueName: name }));
    const { Attributes } = await sqs.send(new GetQueueAttributesCommand({ QueueUrl, AttributeNames: ["QueueArn"] }));
    return { url: QueueUrl, arn: Attributes.QueueArn };
  };

  const billing = await makeQueue("billing-queue");
  const inventory = await makeQueue("inventory-queue");
  const alerts = await makeQueue("alerts-queue");

  const allowSns = (queue) =>
    sqs.send(
      new SetQueueAttributesCommand({
        QueueUrl: queue.url,
        Attributes: {
          Policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Principal: "*",
                Action: "sqs:SendMessage",
                Resource: queue.arn,
                Condition: { ArnEquals: { "aws:SourceArn": topicArn } },
              },
            ],
          }),
        },
      })
    );

  await Promise.all([allowSns(billing), allowSns(inventory), allowSns(alerts)]);

  // billing + inventory get ALL order events; alerts only high-value ones (via filter policy).
  await sns.send(new SubscribeCommand({ TopicArn: topicArn, Protocol: "sqs", Endpoint: billing.arn }));
  await sns.send(new SubscribeCommand({ TopicArn: topicArn, Protocol: "sqs", Endpoint: inventory.arn }));
  await sns.send(
    new SubscribeCommand({
      TopicArn: topicArn,
      Protocol: "sqs",
      Endpoint: alerts.arn,
      Attributes: { FilterPolicy: JSON.stringify({ event_type: ["order.placed"], high_value: ["true"] }) },
    })
  );
  console.log("Subscribed billing, inventory (all orders) and alerts (high-value only)");

  // --- Publish events ---
  console.log("\n=== Publishing order events ===");
  // Small order — reaches billing + inventory, but NOT alerts.
  await sns.send(
    new PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify({ order_id: "ord-001", total: 19.99 }),
      MessageAttributes: {
        event_type: { DataType: "String", StringValue: "order.placed" },
        high_value: { DataType: "String", StringValue: "false" },
      },
    })
  );
  console.log("Published: ord-001 ($19.99) — small order");

  // Large order — reaches all 3 queues.
  await sns.send(
    new PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify({ order_id: "ord-002", total: 499.0 }),
      MessageAttributes: {
        event_type: { DataType: "String", StringValue: "order.placed" },
        high_value: { DataType: "String", StringValue: "true" },
      },
    })
  );
  console.log("Published: ord-002 ($499.00) — high-value order");

  await sleep(1000);

  // --- Inspect each queue ---
  const drain = async (queue, name) => {
    const { Messages = [] } = await sqs.send(new ReceiveMessageCommand({ QueueUrl: queue.url, MaxNumberOfMessages: 10, WaitTimeSeconds: 2 }));
    const orders = Messages.map((m) => JSON.parse(JSON.parse(m.Body).Message).order_id);
    console.log(`  ${name}: ${JSON.stringify(orders)}`);
  };

  console.log("\n=== Messages received per queue ===");
  await drain(billing, "billing  ");
  await drain(inventory, "inventory");
  await drain(alerts, "alerts   ");
  // Expected: billing/inventory get [ord-001, ord-002]; alerts gets [ord-002].

  // --- Cleanup ---
  await sns.send(new DeleteTopicCommand({ TopicArn: topicArn }));
  for (const q of [billing, inventory, alerts]) await sqs.send(new DeleteQueueCommand({ QueueUrl: q.url }));
  console.log("\nCleaned up.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
