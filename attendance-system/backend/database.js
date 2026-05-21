const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from the backend folder
dotenv.config({ path: path.join(__dirname, '.env') });

// MySQL Connection Pool
const pool = mysql.createPool({
  // Support Railway defaults (MYSQLHOST) or local DB_HOST
  host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
  user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'attendance_system',
  port: process.env.DB_PORT || process.env.MYSQLPORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
});

// Test DB connection and ensure required tables exist
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL connected successfully');

    // Ensure teacher_grade_levels table exists (migration for existing DBs)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS teacher_grade_levels (
        id INT PRIMARY KEY AUTO_INCREMENT,
        teacher_id INT NOT NULL,
        grade_level VARCHAR(20) NOT NULL,
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_teacher_grade (teacher_id, grade_level)
      )
    `);

    connection.release();
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
  }
}

module.exports = { pool, testConnection };
