const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const grpc = require('@grpc/grpc-js');
const { pool } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const allowedRoles = new Set(['member', 'admin']);

function signToken(user) {
  return jwt.sign(
    { sub: String(user.uid), uid: user.uid, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function grpcError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function register(call, callback) {
  const { username, password, role } = call.request;
  if (!username || !password || !role) {
    return callback(grpcError(grpc.status.INVALID_ARGUMENT, 'username, password and role are required'));
  }
  if (!allowedRoles.has(role)) {
    return callback(grpcError(grpc.status.INVALID_ARGUMENT, 'role must be member or admin'));
  }
  if (password.length < 6) {
    return callback(grpcError(grpc.status.INVALID_ARGUMENT, 'password must contain at least 6 characters'));
  }
  try {
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users(username, password, role) VALUES($1, $2, $3) RETURNING uid, username, role',
      [username, hash, role]
    );
    const user = result.rows[0];
    return callback(null, { ...user, token: signToken(user), message: 'Register successful' });
  } catch (error) {
    if (error.code === '23505') {
      return callback(grpcError(grpc.status.ALREADY_EXISTS, 'username already exists'));
    }
    console.error('register error:', error.message);
    return callback(grpcError(grpc.status.INTERNAL, 'internal server error'));
  }
}

async function login(call, callback) {
  const { username, password } = call.request;
  if (!username || !password) {
    return callback(grpcError(grpc.status.INVALID_ARGUMENT, 'username and password are required'));
  }
  try {
    const result = await pool.query('SELECT uid, username, password, role FROM users WHERE username=$1', [username]);
    if (!result.rowCount) {
      return callback(grpcError(grpc.status.UNAUTHENTICATED, 'invalid username or password'));
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return callback(grpcError(grpc.status.UNAUTHENTICATED, 'invalid username or password'));
    }
    return callback(null, {
      uid: user.uid,
      username: user.username,
      role: user.role,
      token: signToken(user),
      message: 'Login successful'
    });
  } catch (error) {
    console.error('login error:', error.message);
    return callback(grpcError(grpc.status.INTERNAL, 'internal server error'));
  }
}

function logout(call, callback) {
  // MVP uses stateless JWT. The client discards the token.
  return callback(null, { success: true, message: 'Logout successful. Discard the token on the client.' });
}

function verifyToken(call, callback) {
  try {
    if (!call.request.token) {
      return callback(null, { valid: false, message: 'token is required' });
    }
    const payload = jwt.verify(call.request.token, JWT_SECRET);
    return callback(null, {
      valid: true,
      uid: Number(payload.uid),
      username: payload.username,
      role: payload.role,
      message: 'Token valid'
    });
  } catch (error) {
    return callback(null, { valid: false, message: 'invalid or expired token' });
  }
}

module.exports = { register, login, logout, verifyToken };
