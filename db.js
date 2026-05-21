const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables from .env file for local development
// Railway will inject these variables directly, so this is primarily for local testing.
dotenv.config({ path: '../../.env' }); // Adjust path as necessary based on your project structure

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

console.log('Database connection pool initialized.');

module.exports = pool;