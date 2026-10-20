const express = require('express');
const { customerClient } = require('../grpcClients');
const grpcCall = require('../grpcPromise');
const grpcToHttp = require('../errorMap');
const { authenticate, requireRole, requireSelfOrAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', requireRole('admin'), async (req, res) => {
  try {
    return res.json(await grpcCall(customerClient, 'listCustomers', {}));
  } catch (error) {
    const mapped = grpcToHttp(error); return res.status(mapped.status).json({ message: mapped.message });
  }
});

router.get('/:uid/membership', requireSelfOrAdmin('uid'), async (req, res) => {
  try {
    return res.json(await grpcCall(customerClient, 'getMembership', { uid: Number(req.params.uid) }));
  } catch (error) {
    const mapped = grpcToHttp(error); return res.status(mapped.status).json({ message: mapped.message });
  }
});

router.get('/:uid', requireSelfOrAdmin('uid'), async (req, res) => {
  try {
    return res.json(await grpcCall(customerClient, 'getCustomer', { uid: Number(req.params.uid) }));
  } catch (error) {
    const mapped = grpcToHttp(error); return res.status(mapped.status).json({ message: mapped.message });
  }
});

router.post('/', requireRole('admin'), async (req, res) => {
  try {
    return res.status(201).json(await grpcCall(customerClient, 'createCustomer', req.body));
  } catch (error) {
    const mapped = grpcToHttp(error); return res.status(mapped.status).json({ message: mapped.message });
  }
});

router.put('/:uid', requireSelfOrAdmin('uid'), async (req, res) => {
  try {
    const result = await grpcCall(customerClient, 'updateCustomer', { ...req.body, uid: Number(req.params.uid) });
    return res.json(result);
  } catch (error) {
    const mapped = grpcToHttp(error); return res.status(mapped.status).json({ message: mapped.message });
  }
});

router.delete('/:uid', requireRole('admin'), async (req, res) => {
  try {
    return res.json(await grpcCall(customerClient, 'deleteCustomer', { uid: Number(req.params.uid) }));
  } catch (error) {
    const mapped = grpcToHttp(error); return res.status(mapped.status).json({ message: mapped.message });
  }
});

module.exports = router;
