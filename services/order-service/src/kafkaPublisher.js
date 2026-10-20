const { Kafka, logLevel } = require('kafkajs');
const { pool } = require('./db');

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  logLevel: logLevel.WARN,
  retry: { initialRetryTime: 500, retries: 8 }
});
const producer = kafka.producer();
let connected = false;
let connecting = null;

async function ensureConnected() {
  if (connected) return;
  if (!connecting) {
    connecting = producer.connect()
      .then(() => { connected = true; console.log('Order Service connected to Kafka'); })
      .finally(() => { connecting = null; });
  }
  return connecting;
}

async function publishPendingOutbox() {
  try {
    await ensureConnected();
    const result = await pool.query(
      `SELECT event_id, event_type, aggregate_id, payload
       FROM outbox_events
       WHERE status='PENDING'
       ORDER BY event_id
       LIMIT 20`
    );
    for (const row of result.rows) {
      await producer.send({
        topic: process.env.ORDER_CREATED_TOPIC || 'order-created',
        messages: [{ key: String(row.aggregate_id), value: JSON.stringify(row.payload) }]
      });
      await pool.query(
        `UPDATE outbox_events SET status='PUBLISHED', published_at=NOW() WHERE event_id=$1`,
        [row.event_id]
      );
      console.log(`Published ${row.event_type} event for order ${row.aggregate_id}`);
    }
  } catch (error) {
    console.error('Outbox publish retry pending:', error.message);
    connected = false;
  }
}

function startOutboxPublisher() {
  publishPendingOutbox();
  return setInterval(publishPendingOutbox, Number(process.env.OUTBOX_POLL_MS || 3000));
}

module.exports = { publishPendingOutbox, startOutboxPublisher };
