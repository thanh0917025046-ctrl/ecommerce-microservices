require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const handlers = require('./handlers');
const { startConsumer } = require('./kafkaConsumer');

const protoPath = path.resolve(__dirname, '../../../proto/shipment.proto');
const definition = protoLoader.loadSync(protoPath, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const shipmentProto = grpc.loadPackageDefinition(definition).shipment;

async function start() {
  await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27018/shipmentdb');
  const server = new grpc.Server();
  server.addService(shipmentProto.ShipmentService.service, handlers);
  const port = process.env.GRPC_PORT || '50055';
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (error) => {
    if (error) throw error;
    console.log(`Shipment Service gRPC listening on ${port}`);
    startConsumer().catch((err) => {
      console.error('Kafka consumer startup failed:', err.message);
      setTimeout(() => startConsumer().catch((e) => console.error('Kafka consumer retry failed:', e.message)), 5000);
    });
  });
}

start().catch((error) => {
  console.error('Shipment Service startup error:', error);
  process.exit(1);
});
