const express = require('express');
const { productClient } = require('../grpcClients');
const grpcCall = require('../grpcPromise');
const grpcToHttp = require('../errorMap');
const { authenticate, requireRole } = require('../middleware/auth');
const { getRedisClient } = require('../redis');

const router = express.Router();
router.use(authenticate);

async function clearProductCache() {
  const redis = getRedisClient();
  if (redis) await redis.del('cache:products');
}

router.get('/', async (req, res) => {
  try {
    const redis = getRedisClient();
    if (redis) {
      const cached = await redis.get('cache:products');
      if (cached) return res.json(JSON.parse(cached));
    }
    const result = await grpcCall(productClient, 'listProducts', {});
    if (redis) await redis.set('cache:products', JSON.stringify(result), { EX: 30 });
    return res.json(result);
  } catch (error) {
    const mapped = grpcToHttp(error); return res.status(mapped.status).json({ message: mapped.message });
  }
});

router.get('/:pid', async (req, res) => {
  try {
    const result = await grpcCall(productClient, 'getProduct', { pid: Number(req.params.pid) });
    return res.json(result.product);
  } catch (error) {
    const mapped = grpcToHttp(error); return res.status(mapped.status).json({ message: mapped.message });
  }
});

router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const result = await grpcCall(productClient, 'createProduct', req.body);
    await clearProductCache();
    return res.status(201).json(result.product);
  } catch (error) {
    const mapped = grpcToHttp(error); return res.status(mapped.status).json({ message: mapped.message });
  }
});

router.put('/:pid', requireRole('admin'), async (req, res) => {
  try {
    const result = await grpcCall(productClient, 'updateProduct', { ...req.body, pid: Number(req.params.pid) });
    await clearProductCache();
    return res.json(result.product);
  } catch (error) {
    const mapped = grpcToHttp(error); return res.status(mapped.status).json({ message: mapped.message });
  }
});

router.delete('/:pid', requireRole('admin'), async (req, res) => {
  try {
    const result = await grpcCall(productClient, 'deleteProduct', { pid: Number(req.params.pid) });
    await clearProductCache();
    return res.json(result);
  } catch (error) {
    const mapped = grpcToHttp(error); return res.status(mapped.status).json({ message: mapped.message });
  }
});

module.exports = router;
