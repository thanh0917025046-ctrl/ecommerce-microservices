const grpc = require('@grpc/grpc-js');
const Product = require('./model');

function grpcError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function mapProduct(doc) {
  return {
    pid: Number(doc.pid),
    pname: doc.pname,
    price: Number(doc.price),
    quantity: Number(doc.quantity)
  };
}

async function nextPid() {
  const last = await Product.findOne({}).sort({ pid: -1 }).lean();
  return last ? Number(last.pid) + 1 : 1;
}

function validateProduct(input) {
  const pname = String(input.pname || '').trim();
  const price = Number(input.price);
  const quantity = Number(input.quantity);
  if (!pname) return 'pname is required';
  if (!Number.isFinite(price) || price < 0) return 'price must be a non-negative number';
  if (!Number.isInteger(quantity) || quantity < 0) return 'quantity must be a non-negative integer';
  return null;
}

async function listProducts(call, callback) {
  try {
    const items = await Product.find({}).sort({ pid: 1 }).lean();
    return callback(null, { items: items.map(mapProduct) });
  } catch (error) {
    return callback(grpcError(grpc.status.INTERNAL, 'internal server error'));
  }
}

async function getProduct(call, callback) {
  try {
    const product = await Product.findOne({ pid: Number(call.request.pid) }).lean();
    if (!product) return callback(grpcError(grpc.status.NOT_FOUND, 'product not found'));
    return callback(null, { product: mapProduct(product), message: 'OK' });
  } catch (error) {
    return callback(grpcError(grpc.status.INTERNAL, 'internal server error'));
  }
}

async function createProduct(call, callback) {
  const message = validateProduct(call.request);
  if (message) return callback(grpcError(grpc.status.INVALID_ARGUMENT, message));
  try {
    const product = await Product.create({
      pid: await nextPid(),
      pname: String(call.request.pname).trim(),
      price: Number(call.request.price),
      quantity: Number(call.request.quantity)
    });
    return callback(null, { product: mapProduct(product), message: 'Product created' });
  } catch (error) {
    if (error.code === 11000) return callback(grpcError(grpc.status.ALREADY_EXISTS, 'product id already exists'));
    return callback(grpcError(grpc.status.INTERNAL, 'internal server error'));
  }
}

async function updateProduct(call, callback) {
  const message = validateProduct(call.request);
  if (message) return callback(grpcError(grpc.status.INVALID_ARGUMENT, message));
  try {
    const product = await Product.findOneAndUpdate(
      { pid: Number(call.request.pid) },
      { pname: String(call.request.pname).trim(), price: Number(call.request.price), quantity: Number(call.request.quantity) },
      { new: true, runValidators: true }
    ).lean();
    if (!product) return callback(grpcError(grpc.status.NOT_FOUND, 'product not found'));
    return callback(null, { product: mapProduct(product), message: 'Product updated' });
  } catch (error) {
    return callback(grpcError(grpc.status.INTERNAL, 'internal server error'));
  }
}

async function deleteProduct(call, callback) {
  try {
    const product = await Product.findOneAndDelete({ pid: Number(call.request.pid) }).lean();
    if (!product) return callback(grpcError(grpc.status.NOT_FOUND, 'product not found'));
    return callback(null, { success: true, pid: Number(product.pid), message: 'Product deleted' });
  } catch (error) {
    return callback(grpcError(grpc.status.INTERNAL, 'internal server error'));
  }
}

async function reserveProducts(call, callback) {
  const requested = Array.isArray(call.request.items) ? call.request.items : [];
  if (!requested.length) return callback(grpcError(grpc.status.INVALID_ARGUMENT, 'at least one item is required'));

  const normalized = [];
  const seen = new Set();
  for (const item of requested) {
    const pid = Number(item.pid);
    const qty = Number(item.qty);
    if (!Number.isInteger(pid) || pid <= 0 || !Number.isInteger(qty) || qty <= 0) {
      return callback(grpcError(grpc.status.INVALID_ARGUMENT, 'pid and qty must be positive integers'));
    }
    if (seen.has(pid)) return callback(grpcError(grpc.status.INVALID_ARGUMENT, 'duplicate pid in order items'));
    seen.add(pid);
    normalized.push({ pid, qty });
  }

  try {
    const products = await Product.find({ pid: { $in: normalized.map((x) => x.pid) } }).lean();
    if (products.length !== normalized.length) {
      return callback(grpcError(grpc.status.NOT_FOUND, 'one or more products not found'));
    }

    const byPid = new Map(products.map((p) => [Number(p.pid), p]));
    for (const item of normalized) {
      const product = byPid.get(item.pid);
      if (Number(product.quantity) < item.qty) {
        return callback(grpcError(grpc.status.RESOURCE_EXHAUSTED, `insufficient stock for pid ${item.pid}`));
      }
    }

    const operations = normalized.map((item) => ({
      updateOne: { filter: { pid: item.pid }, update: { $inc: { quantity: -item.qty } } }
    }));
    await Product.bulkWrite(operations);

    const items = normalized.map((item) => {
      const p = byPid.get(item.pid);
      return { pid: item.pid, pname: p.pname, qty: item.qty, unit_price: Number(p.price) };
    });
    return callback(null, { items, message: 'Stock reserved' });
  } catch (error) {
    console.error('reserveProducts error:', error.message);
    return callback(grpcError(grpc.status.INTERNAL, 'internal server error'));
  }
}

async function restoreProducts(call, callback) {
  const items = Array.isArray(call.request.items) ? call.request.items : [];
  try {
    const operations = items
      .filter((item) => Number(item.pid) > 0 && Number(item.qty) > 0)
      .map((item) => ({ updateOne: { filter: { pid: Number(item.pid) }, update: { $inc: { quantity: Number(item.qty) } } } }));
    if (operations.length) await Product.bulkWrite(operations);
    return callback(null, { success: true, message: 'Stock restored' });
  } catch (error) {
    return callback(grpcError(grpc.status.INTERNAL, 'failed to restore stock'));
  }
}

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct, reserveProducts, restoreProducts };
