require('dotenv').config();
const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { pool } = require('./db');
const handlers = require('./handlers');
const { startOutboxPublisher } = require('./kafkaPublisher');

const protoPath = path.resolve(__dirname, '../../../proto/order.proto');
const definition = protoLoader.loadSync(protoPath, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const orderProto = grpc.loadPackageDefinition(definition).order;

async function start() {
  await pool.query('SELECT 1');
  const server = new grpc.Server();
  server.addService(orderProto.OrderService.service, handlers);
  const port = process.env.GRPC_PORT || '50054';
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (error) => {
    if (error) throw error;
    console.log(`Order Service gRPC listening on ${port}`);
    startOutboxPublisher();
  });
}

start().catch((error) => {
  console.error('Order Service startup error:', error);
  process.exit(1);
});
