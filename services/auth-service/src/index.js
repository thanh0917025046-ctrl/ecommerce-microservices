require('dotenv').config();
const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { waitForDatabase } = require('./db');
const handlers = require('./handlers');

const PROTO_PATH = path.resolve(__dirname, '../../../proto/auth.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const authProto = grpc.loadPackageDefinition(packageDefinition).auth;
const port = process.env.GRPC_PORT || '50051';

async function main() {
  await waitForDatabase();
  const server = new grpc.Server();
  server.addService(authProto.AuthService.service, {
    register: handlers.register,
    login: handlers.login,
    logout: handlers.logout,
    verifyToken: handlers.verifyToken
  });
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (error) => {
    if (error) throw error;
    console.log(`Auth Service gRPC listening on ${port}`);
  });
}

main().catch((error) => {
  console.error('Auth Service failed:', error.message);
  process.exit(1);
});
