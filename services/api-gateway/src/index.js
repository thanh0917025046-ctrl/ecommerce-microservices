require('dotenv').config();
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const shipmentRoutes = require('./routes/shipmentRoutes');
const { connectRedis } = require('./redis');

async function bootstrap() {
  const app = express();
  const port = Number(process.env.PORT || 3000);
  app.use(express.json({ limit: '1mb' }));

  const redis = await connectRedis();
  const limiterOptions = {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
    limit: Number(process.env.RATE_LIMIT_MAX || 100),
    standardHeaders: 'draft-8',
    legacyHeaders: false
  };
  if (redis) limiterOptions.store = new RedisStore({ sendCommand: (...args) => redis.sendCommand(args) });
  app.use(rateLimit(limiterOptions));

  const health = (req, res) => res.json({ status: 'UP', service: 'api-gateway', message: 'E-commerce API is running' });
  app.get('/health', health);
  app.get('/api/health', health);
  app.use('/api/auth', authRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/shipments', shipmentRoutes);

  app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
  app.use((error, req, res, next) => {
    console.error('Gateway error:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  });

  app.listen(port, '0.0.0.0', () => console.log(`API Gateway listening on ${port}`));
}

bootstrap().catch((error) => {
  console.error('API Gateway startup error:', error);
  process.exit(1);
});
