require('dotenv').config();
const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const handlers = require('./handlers');
const { pool } = require('./db');

const protoPath = path.resolve(__dirname, '../../../proto/customer.proto');
const definition = protoLoader.loadSync(protoPath, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const customerProto = grpc.loadPackageDefinition(definition).customer;

async function start() {
  await pool.query('SELECT 1');
  const server = new grpc.Server();
  server.addService(customerProto.CustomerService.service, handlers);
  const port = process.env.GRPC_PORT || '50052';
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (error) => {
    if (error) throw error;
    console.log(`Customer Service gRPC listening on ${port}`);
  });
}

start().catch((error) => {
  console.error('Customer Service startup error:', error);
  process.exit(1);
});
