const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://customeruser:customerpass@localhost:5433/customerdb'
});

module.exports = { pool };
