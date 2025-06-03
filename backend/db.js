const { Pool } = require('pg');

class Database {
  constructor() {
    this.pool = new Pool({
      user: 'postgres',        
      host: 'localhost',
      database: 'fiche_deplacement', 
      password: 'post',
      port: 5432,
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
