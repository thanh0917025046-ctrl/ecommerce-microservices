const { createClient } = require('redis');

let client;

async function connectRedis() {
  if (client?.isOpen) return client;
  client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  client.on('error', (error) => console.error('Redis error:', error.message));
  try {
    await client.connect();
    console.log('API Gateway connected to Redis');
    return client;
  } catch (error) {
    console.error('Redis unavailable, gateway will use memory rate limit:', error.message);
    return null;
  }
}

function getRedisClient() {
  return client?.isOpen ? client : null;
}

module.exports = { connectRedis, getRedisClient };
