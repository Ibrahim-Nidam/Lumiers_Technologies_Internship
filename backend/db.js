require('dotenv').config();

const { Pool } = require('pg');

class Database {
  constructor() {
    this.pool = new Pool({
      user: process.env.PG_USERNAME,
      host: process.env.PG_HOST,
      database: process.env.PG_DATABASE,
      password: process.env.PG_PASSWORD,
      port: process.env.PG_PORT,
    });
  }

  query(text, params) {
    return this.pool.query(text, params);
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = new Database();