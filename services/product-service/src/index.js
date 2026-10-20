require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const Product = require('./model');
const handlers = require('./handlers');

const protoPath = path.resolve(__dirname, '../../../proto/product.proto');
const definition = protoLoader.loadSync(protoPath, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const productProto = grpc.loadPackageDefinition(definition).product;

async function seedProducts() {
  if (await Product.countDocuments() > 0) return;
  await Product.insertMany([
    { pid: 1, pname: 'Laptop', price: 1500, quantity: 10 },
    { pid: 2, pname: 'Mouse', price: 25, quantity: 100 },
    { pid: 3, pname: 'Keyboard', price: 50, quantity: 50 }
  ]);
  console.log('Product demo data seeded');
}

async function start() {
  await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/productdb');
  await seedProducts();
  const server = new grpc.Server();
  server.addService(productProto.ProductService.service, handlers);
  const port = process.env.GRPC_PORT || '50053';
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (error) => {
    if (error) throw error;
    console.log(`Product Service gRPC listening on ${port}`);
  });
}

start().catch((error) => {
  console.error('Product Service startup error:', error);
  process.exit(1);
});
