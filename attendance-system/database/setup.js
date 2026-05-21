const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

async function runStatements(connection, sqlText) {
  // Split by semicolon and execute each statement separately.
  // This avoids mysql2 prepared-statement multi-statement protocol issues.
  const statements = sqlText
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  let i = 0;
  for (const stmt of statements) {
    i += 1;
    const preview = stmt.replace(/\s+/g, ' ').trim().slice(0, 120);
    console.log(`➡️  Running statement #${i}: ${preview}${stmt.length > 120 ? '...' : ''}`);
    await connection.query(stmt);
  }
}

async function setupDatabase() {
const config = {
    host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
    port: process.env.DB_PORT || process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
  };

  let connection;
  try {
    console.log('🔄 Connecting to MySQL...');
    connection = await mysql.createConnection(config);
    
    const dbName = process.env.DB_NAME || process.env.MYSQLDATABASE || 'attendance_system';

    console.log('🧩 Creating/ensuring database...');
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`✅ Database \`${dbName}\` ready`);

    // Avoid USE (...) to prevent protocol issues in some mysql2 configurations.
    // Close current connection and reconnect directly to the target DB.
    await connection.end();
    connection = await mysql.createConnection({
      ...config,
      database: dbName,
    });
    console.log(`✅ Connected to database \`${dbName}\``);

    // Make setup idempotent: if tables already exist, wipe them.
    // This ensures the attendance table schema matches the current schema.sql.
    console.log('🧹 Dropping existing tables (if any)...');
    const dropSql = [
      'DROP TABLE IF EXISTS `attendance`',
      'DROP TABLE IF EXISTS `sessions`',
      'DROP TABLE IF EXISTS `enrollments`',
      'DROP TABLE IF EXISTS `teacher_grade_levels`',
      'DROP TABLE IF EXISTS `subjects`',
      'DROP TABLE IF EXISTS `users`',
    ];
    for (const stmt of dropSql) {
      await connection.query(stmt);
    }



    // Schema
    console.log('📝 Executing schema.sql...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = await fs.readFile(schemaPath, 'utf8');
    await runStatements(connection, schemaSql);
    console.log('✅ Schema created');

    // Seed
    console.log('🌱 Executing seed.sql...');
    const seedPath = path.join(__dirname, 'seed.sql');
    const seedSql = await fs.readFile(seedPath, 'utf8');
    await runStatements(connection, seedSql);
    console.log('✅ Seed data inserted');

    // Validate
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`✅ Test: Found ${users[0].count} users in DB`);

    console.log('\n🎉 Database setup complete!');
    console.log('Next: cd ../backend && npm start');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

setupDatabase().catch(console.error);
