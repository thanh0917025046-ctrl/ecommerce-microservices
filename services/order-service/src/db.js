const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://orderuser:orderpass@localhost:5434/orderdb'
});

module.exports = { pool };
