const express = require('express');
const { shipmentClient } = require('../grpcClients');
const grpcCall = require('../grpcPromise');
const grpcToHttp = require('../errorMap');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/:shipid', async (req, res) => {
  try {
    const result = await grpcCall(shipmentClient, 'getShipment', { shipid: Number(req.params.shipid) });
    return res.json(result.shipment);
  } catch (error) {
    const mapped = grpcToHttp(error); return res.status(mapped.status).json({ message: mapped.message });
  }
});

router.patch('/:shipid/status', requireRole('admin'), async (req, res) => {
  try {
    const result = await grpcCall(shipmentClient, 'updateStatus', { shipid: Number(req.params.shipid), status: req.body.status });
    return res.json(result.shipment);
  } catch (error) {
    const mapped = grpcToHttp(error); return res.status(mapped.status).json({ message: mapped.message });
  }
});

module.exports = router;
