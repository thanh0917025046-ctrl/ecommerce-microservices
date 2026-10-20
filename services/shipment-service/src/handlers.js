const grpc = require('@grpc/grpc-js');
const Shipment = require('./model');

function grpcError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function mapShipment(doc) {
  return { shipid: Number(doc.shipid), oid: Number(doc.oid), status: doc.status };
}

async function getShipment(call, callback) {
  try {
    const shipment = await Shipment.findOne({ shipid: Number(call.request.shipid) }).lean();
    if (!shipment) return callback(grpcError(grpc.status.NOT_FOUND, 'shipment not found'));
    return callback(null, { shipment: mapShipment(shipment), message: 'OK' });
  } catch (error) {
    return callback(grpcError(grpc.status.INTERNAL, 'internal server error'));
  }
}

async function updateStatus(call, callback) {
  const allowed = new Set(['PENDING', 'SHIPPING', 'DELIVERED', 'CANCELLED']);
  const status = String(call.request.status || '').toUpperCase();
  if (!allowed.has(status)) return callback(grpcError(grpc.status.INVALID_ARGUMENT, 'invalid shipment status'));
  try {
    const shipment = await Shipment.findOneAndUpdate(
      { shipid: Number(call.request.shipid) },
      { status },
      { new: true, runValidators: true }
    ).lean();
    if (!shipment) return callback(grpcError(grpc.status.NOT_FOUND, 'shipment not found'));
    return callback(null, { shipment: mapShipment(shipment), message: 'Shipment status updated' });
  } catch (error) {
    return callback(grpcError(grpc.status.INTERNAL, 'internal server error'));
  }
}

module.exports = { getShipment, updateStatus };
