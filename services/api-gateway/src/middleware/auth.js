const { authClient } = require('../grpcClients');
const grpcCall = require('../grpcPromise');

async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header' });
  }
  try {
    const result = await grpcCall(authClient, 'verifyToken', { token });
    if (!result.valid) return res.status(401).json({ message: result.message || 'Invalid token' });
    req.user = { uid: Number(result.uid), username: result.username, role: result.role };
    req.token = token;
    return next();
  } catch (error) {
    console.error('Auth gRPC error:', error.message);
    return res.status(503).json({ message: 'Authentication service unavailable' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) return res.status(403).json({ message: `Role ${role} required` });
    return next();
  };
}

function requireAnyRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ message: `Required role: ${roles.join(' or ')}` });
    return next();
  };
}

function requireSelfOrAdmin(paramName = 'uid') {
  return (req, res, next) => {
    const requestedUid = Number(req.params[paramName]);
    if (req.user?.role === 'admin' || req.user?.uid === requestedUid) return next();
    return res.status(403).json({ message: 'Cannot access another customer resource' });
  };
}

module.exports = { authenticate, requireRole, requireAnyRole, requireSelfOrAdmin };
