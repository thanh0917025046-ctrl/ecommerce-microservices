const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

function load(filename, packageName) {
  const protoPath = path.resolve(__dirname, `../../../proto/${filename}`);
  const definition = protoLoader.loadSync(protoPath, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
  return grpc.loadPackageDefinition(definition)[packageName];
}

const customerProto = load('customer.proto', 'customer');
const productProto = load('product.proto', 'product');

const customerClient = new customerProto.CustomerService(
  process.env.CUSTOMER_GRPC_URL || 'localhost:50052',
  grpc.credentials.createInsecure()
);
const productClient = new productProto.ProductService(
  process.env.PRODUCT_GRPC_URL || 'localhost:50053',
  grpc.credentials.createInsecure()
);

function grpcCall(client, method, payload) {
  return new Promise((resolve, reject) => {
    client[method](payload, (error, response) => error ? reject(error) : resolve(response));
  });
}

module.exports = { customerClient, productClient, grpcCall };
