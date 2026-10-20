const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
  shipid: { type: Number, unique: true, required: true, index: true },
  oid: { type: Number, unique: true, required: true, index: true },
  status: {
    type: String,
    enum: ['PENDING', 'SHIPPING', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING'
  }
}, { versionKey: false, timestamps: true });

module.exports = mongoose.model('Shipment', shipmentSchema);
