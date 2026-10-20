const express = require('express');
const { orderClient } = require('../grpcClients');
const grpcCall = require('../grpcPromise');
const grpcToHttp = require('../errorMap');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.post('/', async (req, res) => {
  try {
    const result = await grpcCall(orderClient, 'createOrder', { uid: req.user.uid, items: req.body.items || [] });
    return res.status(201).json(result.order);
  } catch (error) {
    const mapped = grpcToHttp(error); return res.status(mapped.status).json({ message: mapped.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await grpcCall(orderClient, 'listOrders', { uid: req.user.uid, is_admin: req.user.role === 'admin' });
    return res.json(result);
  } catch (error) {
    const mapped = grpcToHttp(error); return res.status(mapped.status).json({ message: mapped.message });
  }
});

router.get('/:oid', async (req, res) => {
  try {
    const result = await grpcCall(orderClient, 'getOrder', {
      oid: Number(req.params.oid), requester_uid: req.user.uid, is_admin: req.user.role === 'admin'
    });
    return res.json(result.order);
  } catch (error) {
    const mapped = grpcToHttp(error); return res.status(mapped.status).json({ message: mapped.message });
  }
});

module.exports = router;
