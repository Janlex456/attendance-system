const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const { pool } = require('./attendance-system/backend/database.js');

async function fixDatabase() {
  try {
    // Use backend's existing pool config with .env
    const mysql = require('mysql2/promise');
    const dotenv = require('dotenv');
dotenv.config({ path: './.env' });
    
    // Recreate using same config as backend
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'mysql',
      port: process.env.DB_PORT || 3306,
    });

    const connection = await pool.getConnection();

    // Drop and recreate database
    await connection.execute('DROP DATABASE IF EXISTS attendance_system');
    await connection.execute('CREATE DATABASE attendance_system');
    console.log('✅ Database recreated');

    connection.release();
    await pool.end();

    // Now connect to new DB and apply schema
    const schemaPool = mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'attendance_system',
    });

    const schemaConn = await schemaPool.getConnection();

    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'attendance-system/database/schema.sql');
    const schemaSql = await fs.readFile(schemaPath, 'utf8');
    await schemaConn.execute(schemaSql.replace(/--.*$/gm, '')); // remove comments
    console.log('✅ Schema applied');

    // Read and execute seed.sql
    const seedPath = path.join(__dirname, 'attendance-system/database/seed.sql');
    const seedSql = await fs.readFile(seedPath, 'utf8');
    await schemaConn.execute(seedSql.replace(/--.*$/gm, ''));
    console.log('✅ Seed data applied');

    schemaConn.release();
    await schemaPool.end();

    // Verify
    const verifyPool = mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'attendance_system',
    });

    const verifyConn = await verifyPool.getConnection();
    const [subjects] = await verifyConn.execute('DESCRIBE subjects');
    console.table(subjects);
    verifyConn.release();
    await verifyPool.end();

    console.log('🎉 Database fixed! class_start_time column now exists.');
    console.log('Run: cd attendance-system/backend && node server.js to test');
  } catch (err) {
    console.error('❌ Fix failed:', err.message);
  }
}

fixDatabase();

