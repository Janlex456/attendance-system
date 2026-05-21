const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function setupComplete() {
  const config = {
    host: 'localhost',
    user: 'root',
    password: 'password',
    multipleStatements: true
  };

  let connection;
  try {
    console.log('🔄 Connecting to MySQL with root/password...');
    connection = await mysql.createConnection({...config, multipleStatements: true});

    // Create/use database
    await connection.execute('CREATE DATABASE IF NOT EXISTS `attendance_system`');
    console.log('✅ Database ready');
    await connection.execute('USE `attendance_system`');

    // Schema
    console.log('📝 Executing schema...');
    const schemaPath = path.join(__dirname, 'attendance-system/database/schema.sql');
    const schemaSql = await fs.readFile(schemaPath, 'utf8');
    await connection.query(schemaSql);
    console.log('✅ Schema created');

    // Seed
    console.log('🌱 Executing seed...');
    const seedPath = path.join(__dirname, 'attendance-system/database/seed.sql');
    const seedSql = await fs.readFile(seedPath, 'utf8');
    await connection.query(seedSql);
    console.log('✅ Seed inserted');

    // Verify admin
    const [users] = await connection.execute("SELECT * FROM users WHERE role='admin'");
    console.log('✅ Admin user:', users[0]);

    console.log('\n🎉 COMPLETE! Login: admin@example.com / password');
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

setupComplete();
