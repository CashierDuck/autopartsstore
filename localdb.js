// connects to our railway db where we store orders and stuff

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'switchback.proxy.rlwy.net',
  port: 53809,
  user: 'root',
  password: 'DkjQxAANMGQdSpvNqKFgIEETSaRUNaTL',
  database: 'railway',
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
