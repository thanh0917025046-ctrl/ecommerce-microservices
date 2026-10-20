const { Kafka, logLevel } = require('kafkajs');
const Shipment = require('./model');

const kafka = new Kafka({
  clientId: 'shipment-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  logLevel: logLevel.WARN,
  retry: { initialRetryTime: 500, retries: 10 }
});

async function startConsumer() {
  const consumer = kafka.consumer({ groupId: 'shipment-service-order-created' });
  await consumer.connect();
  await consumer.subscribe({ topic: process.env.ORDER_CREATED_TOPIC || 'order-created', fromBeginning: true });
  console.log('Shipment Service consuming Kafka topic order-created');
  await consumer.run({
    eachMessage: async ({ message }) => {
      let event;
      try {
        event = JSON.parse(message.value.toString());
      } catch (error) {
        console.error('Invalid Kafka JSON event ignored');
        return;
      }
      if (!event.oid) {
        console.error('OrderCreated event missing oid; shipment not created');
        return;
      }
      try {
        const existing = await Shipment.findOne({ oid: Number(event.oid) }).lean();
        if (existing) {
          console.log(`Duplicate OrderCreated ignored for oid ${event.oid}`);
          return;
        }
        // Deterministic shipid=oid keeps the MVP easy to demo and guarantees idempotency.
        await Shipment.create({ shipid: Number(event.oid), oid: Number(event.oid), status: 'PENDING' });
        console.log(`Shipment created for oid ${event.oid} with status PENDING`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`Duplicate OrderCreated ignored for oid ${event.oid}`);
          return;
        }
        console.error('Shipment Kafka handler error:', error.message);
        throw error;
      }
    }
  });
}

module.exports = { startConsumer };
