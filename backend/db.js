require('dotenv').config();

const { Pool } = require('pg');

class Database {
  /**
   * Constructor for the Database class.
   *
   * Creates a Postgres client pool using environment variables.
   *
   * @param {Object} [options] - An object with options to pass to the Pool constructor.
   * @see https://node-postgres.com/api/pool
   * @throws TypeError If any of the required environment variables are not set.
   */
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