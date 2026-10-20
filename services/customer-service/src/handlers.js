const grpc = require('@grpc/grpc-js');
const { pool } = require('./db');

function grpcError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function mapCustomer(row) {
  return { uid: Number(row.uid), fullname: row.fullname, mid: Number(row.mid) };
}

async function ensureMembershipExists(mid) {
  const result = await pool.query('SELECT mid FROM memberships WHERE mid=$1', [mid]);
  return result.rowCount > 0;
}

async function ensureCustomer(call, callback) {
  const uid = Number(call.request.uid);
  const fullname = String(call.request.fullname || '').trim();
  if (!Number.isInteger(uid) || uid <= 0 || !fullname) {
    return callback(grpcError(grpc.status.INVALID_ARGUMENT, 'uid and fullname are required'));
  }
  try {
    const result = await pool.query(
      `INSERT INTO customers(uid, fullname, mid)
       VALUES($1,$2,1)
       ON CONFLICT(uid) DO UPDATE SET fullname=EXCLUDED.fullname
       RETURNING uid, fullname, mid`,
      [uid, fullname]
    );
    return callback(null, { customer: mapCustomer(result.rows[0]), message: 'Customer ensured' });
  } catch (error) {
    console.error('ensureCustomer error:', error.message);
    return callback(grpcError(grpc.status.INTERNAL, 'internal server error'));
  }
}

async function createCustomer(call, callback) {
  const uid = Number(call.request.uid);
  const mid = Number(call.request.mid || 1);
  const fullname = String(call.request.fullname || '').trim();
  if (!Number.isInteger(uid) || uid <= 0 || !fullname || !Number.isInteger(mid) || mid <= 0) {
    return callback(grpcError(grpc.status.INVALID_ARGUMENT, 'uid, fullname and valid mid are required'));
  }
  try {
    if (!(await ensureMembershipExists(mid))) {
      return callback(grpcError(grpc.status.INVALID_ARGUMENT, 'membership mid does not exist'));
    }
    const result = await pool.query(
      'INSERT INTO customers(uid, fullname, mid) VALUES($1,$2,$3) RETURNING uid,fullname,mid',
      [uid, fullname, mid]
    );
    return callback(null, { customer: mapCustomer(result.rows[0]), message: 'Customer created' });
  } catch (error) {
    if (error.code === '23505') return callback(grpcError(grpc.status.ALREADY_EXISTS, 'customer uid already exists'));
    console.error('createCustomer error:', error.message);
    return callback(grpcError(grpc.status.INTERNAL, 'internal server error'));
  }
}

async function getCustomer(call, callback) {
  const uid = Number(call.request.uid);
  try {
    const result = await pool.query('SELECT uid, fullname, mid FROM customers WHERE uid=$1', [uid]);
    if (!result.rowCount) return callback(grpcError(grpc.status.NOT_FOUND, 'customer not found'));
    return callback(null, { customer: mapCustomer(result.rows[0]), message: 'OK' });
  } catch (error) {
    return callback(grpcError(grpc.status.INTERNAL, 'internal server error'));
  }
}

async function listCustomers(call, callback) {
  try {
    const result = await pool.query('SELECT uid, fullname, mid FROM customers ORDER BY uid');
    return callback(null, { customers: result.rows.map(mapCustomer) });
  } catch (error) {
    return callback(grpcError(grpc.status.INTERNAL, 'internal server error'));
  }
}

async function updateCustomer(call, callback) {
  const uid = Number(call.request.uid);
  const mid = Number(call.request.mid || 1);
  const fullname = String(call.request.fullname || '').trim();
  if (!Number.isInteger(uid) || uid <= 0 || !fullname || !Number.isInteger(mid) || mid <= 0) {
    return callback(grpcError(grpc.status.INVALID_ARGUMENT, 'uid, fullname and valid mid are required'));
  }
  try {
    if (!(await ensureMembershipExists(mid))) {
      return callback(grpcError(grpc.status.INVALID_ARGUMENT, 'membership mid does not exist'));
    }
    const result = await pool.query(
      'UPDATE customers SET fullname=$2, mid=$3 WHERE uid=$1 RETURNING uid,fullname,mid',
      [uid, fullname, mid]
    );
    if (!result.rowCount) return callback(grpcError(grpc.status.NOT_FOUND, 'customer not found'));
    return callback(null, { customer: mapCustomer(result.rows[0]), message: 'Customer updated' });
  } catch (error) {
    return callback(grpcError(grpc.status.INTERNAL, 'internal server error'));
  }
}

async function deleteCustomer(call, callback) {
  const uid = Number(call.request.uid);
  try {
    const result = await pool.query('DELETE FROM customers WHERE uid=$1 RETURNING uid', [uid]);
    if (!result.rowCount) return callback(grpcError(grpc.status.NOT_FOUND, 'customer not found'));
    return callback(null, { success: true, message: 'Customer deleted' });
  } catch (error) {
    return callback(grpcError(grpc.status.INTERNAL, 'internal server error'));
  }
}

async function getMembership(call, callback) {
  const uid = Number(call.request.uid);
  try {
    const result = await pool.query(
      `SELECT c.uid, m.mid, m.mname, m.score
       FROM customers c
       JOIN memberships m ON m.mid = c.mid
       WHERE c.uid=$1`,
      [uid]
    );
    if (!result.rowCount) return callback(grpcError(grpc.status.NOT_FOUND, 'customer or membership not found'));
    const row = result.rows[0];
    return callback(null, {
      uid: Number(row.uid),
      membership: { mid: Number(row.mid), mname: row.mname, score: Number(row.score) },
      message: 'OK'
    });
  } catch (error) {
    return callback(grpcError(grpc.status.INTERNAL, 'internal server error'));
  }
}

module.exports = {
  ensureCustomer,
  createCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
  deleteCustomer,
  getMembership
};
