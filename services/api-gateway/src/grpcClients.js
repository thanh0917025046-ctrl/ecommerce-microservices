const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

function loadProto(filename, packageName) {
  const protoPath = path.resolve(__dirname, `../../../proto/${filename}`);
  const definition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });
  return grpc.loadPackageDefinition(definition)[packageName];
}

const authProto = loadProto('auth.proto', 'auth');
const customerProto = loadProto('customer.proto', 'customer');
const productProto = loadProto('product.proto', 'product');
const orderProto = loadProto('order.proto', 'order');
const shipmentProto = loadProto('shipment.proto', 'shipment');

const credentials = grpc.credentials.createInsecure();
const authClient = new authProto.AuthService(process.env.AUTH_GRPC_URL || 'localhost:50051', credentials);
const customerClient = new customerProto.CustomerService(process.env.CUSTOMER_GRPC_URL || 'localhost:50052', credentials);
const productClient = new productProto.ProductService(process.env.PRODUCT_GRPC_URL || 'localhost:50053', credentials);
const orderClient = new orderProto.OrderService(process.env.ORDER_GRPC_URL || 'localhost:50054', credentials);
const shipmentClient = new shipmentProto.ShipmentService(process.env.SHIPMENT_GRPC_URL || 'localhost:50055', credentials);

module.exports = { authClient, customerClient, productClient, orderClient, shipmentClient };
