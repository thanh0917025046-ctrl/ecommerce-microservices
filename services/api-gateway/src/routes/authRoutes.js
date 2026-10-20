const express = require('express');
const { authClient, customerClient } = require('../grpcClients');
const grpcCall = require('../grpcPromise');
const grpcToHttp = require('../errorMap');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const result = await grpcCall(authClient, 'register', req.body);
    // Keep Customer context synchronized with Identity uid for this MVP.
    try {
      await grpcCall(customerClient, 'ensureCustomer', { uid: Number(result.uid), fullname: req.body.fullname || result.username });
    } catch (provisionError) {
      console.error('Customer auto-provision warning:', provisionError.details || provisionError.message);
    }
    return res.status(201).json(result);
  } catch (error) {
    const mapped = grpcToHttp(error);
    return res.status(mapped.status).json({ message: mapped.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const result = await grpcCall(authClient, 'login', req.body);
    return res.status(200).json(result);
  } catch (error) {
    const mapped = grpcToHttp(error);
    return res.status(mapped.status).json({ message: mapped.message });
  }
});

router.post('/logout', authenticate, async (req, res) => {
  try {
    const result = await grpcCall(authClient, 'logout', { token: req.token });
    return res.status(200).json(result);
  } catch (error) {
    const mapped = grpcToHttp(error);
    return res.status(mapped.status).json({ message: mapped.message });
  }
});

module.exports = router;
