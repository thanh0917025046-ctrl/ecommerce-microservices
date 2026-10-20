const grpc = require('@grpc/grpc-js');
const { pool } = require('./db');
const { customerClient, productClient, grpcCall } = require('./grpcClients');
const { publishPendingOutbox } = require('./kafkaPublisher');

function grpcError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

// Assignment assumption because the provided requirement/test data does not define thresholds.
// score <100 => 0%, 100-499 => 5%, 500-999 => 10%, >=1000 => 20%.
function discountFromScore(score) {
  const value = Number(score || 0);
  if (value >= 1000) return 20;
  if (value >= 500) return 10;
  if (value >= 100) return 5;
  return 0;
}

function translateGrpcError(error) {
  if (typeof error.code === 'number') return error;
  return grpcError(grpc.status.INTERNAL, error.message || 'downstream service error');
}

async function loadOrder(oid) {
  const orderResult = await pool.query(
    'SELECT oid,uid,discount,subtotal,total_amount FROM orders WHERE oid=$1',
    [oid]
  );
  if (!orderResult.rowCount) return null;
  const detailsResult = await pool.query(
    'SELECT pid,qty,unit_price FROM order_details WHERE oid=$1 ORDER BY pid',
    [oid]
  );
  const row = orderResult.rows[0];
  return {
    oid: Number(row.oid),
    uid: Number(row.uid),
    discount: Number(row.discount),
    subtotal: Number(row.subtotal),
    total_amount: Number(row.total_amount),
    items: detailsResult.rows.map((d) => ({ pid: Number(d.pid), qty: Number(d.qty), unit_price: Number(d.unit_price) }))
  };
}

async function createOrder(call, callback) {
  const uid = Number(call.request.uid);
  const items = Array.isArray(call.request.items) ? call.request.items : [];
  if (!Number.isInteger(uid) || uid <= 0 || !items.length) {
    return callback(grpcError(grpc.status.INVALID_ARGUMENT, 'uid and at least one order item are required'));
  }

  const normalized = items.map((item) => ({ pid: Number(item.pid), qty: Number(item.qty) }));
  if (normalized.some((item) => !Number.isInteger(item.pid) || item.pid <= 0 || !Number.isInteger(item.qty) || item.qty <= 0)) {
    return callback(grpcError(grpc.status.INVALID_ARGUMENT, 'pid and qty must be positive integers'));
  }

  let reserved = false;
  try {
    const membership = await grpcCall(customerClient, 'getMembership', { uid });
    const score = Number(membership.membership.score);
    const discount = discountFromScore(score);

    const reserveResult = await grpcCall(productClient, 'reserveProducts', { items: normalized });
    reserved = true;
    const reservedItems = reserveResult.items;
    const subtotal = reservedItems.reduce((sum, item) => sum + Number(item.unit_price) * Number(item.qty), 0);
    const totalAmount = Number((subtotal * (1 - discount / 100)).toFixed(2));

    const client = await pool.connect();
    let oid;
    try {
      await client.query('BEGIN');
      const orderInsert = await client.query(
        `INSERT INTO orders(uid,discount,subtotal,total_amount)
         VALUES($1,$2,$3,$4)
         RETURNING oid`,
        [uid, discount, subtotal, totalAmount]
      );
      oid = Number(orderInsert.rows[0].oid);
      for (const item of reservedItems) {
        await client.query(
          'INSERT INTO order_details(oid,pid,qty,unit_price) VALUES($1,$2,$3,$4)',
          [oid, Number(item.pid), Number(item.qty), Number(item.unit_price)]
        );
      }
      const eventPayload = {
        oid,
        uid,
        discount,
        subtotal,
        total_amount: totalAmount,
        items: reservedItems.map((item) => ({ pid: Number(item.pid), qty: Number(item.qty), unit_price: Number(item.unit_price) }))
      };
      await client.query(
        `INSERT INTO outbox_events(event_type,aggregate_id,payload)
         VALUES('OrderCreated',$1,$2::jsonb)`,
        [oid, JSON.stringify(eventPayload)]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      if (reserved) {
        try { await grpcCall(productClient, 'restoreProducts', { items: normalized }); } catch (_) {}
      }
      throw error;
    } finally {
      client.release();
    }

    publishPendingOutbox();
    const order = await loadOrder(oid);
    return callback(null, { order, message: 'Order created; OrderCreated queued for Kafka' });
  } catch (error) {
    const translated = translateGrpcError(error);
    console.error('createOrder error:', translated.details || translated.message);
    return callback(translated);
  }
}

async function listOrders(call, callback) {
  try {
    const uid = Number(call.request.uid);
    const isAdmin = Boolean(call.request.is_admin);
    const result = isAdmin
      ? await pool.query('SELECT oid FROM orders ORDER BY oid DESC')
      : await pool.query('SELECT oid FROM orders WHERE uid=$1 ORDER BY oid DESC', [uid]);
    const items = [];
    for (const row of result.rows) items.push(await loadOrder(Number(row.oid)));
    return callback(null, { items });
  } catch (error) {
    return callback(grpcError(grpc.status.INTERNAL, 'internal server error'));
  }
}

async function getOrder(call, callback) {
  try {
    const order = await loadOrder(Number(call.request.oid));
    if (!order) return callback(grpcError(grpc.status.NOT_FOUND, 'order not found'));
    if (!call.request.is_admin && order.uid !== Number(call.request.requester_uid)) {
      return callback(grpcError(grpc.status.PERMISSION_DENIED, 'cannot access another customer order'));
    }
    return callback(null, { order, message: 'OK' });
  } catch (error) {
    return callback(grpcError(grpc.status.INTERNAL, 'internal server error'));
  }
}

module.exports = { createOrder, listOrders, getOrder, discountFromScore };
