const mysql = require('mysql2/promise');

async function setupDatabase() {
  let connection;
  try {
    console.log('🔄 Connecting to MySQL...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'mysql',
      port: 3306
    });

    console.log('✅ Connected to MySQL');

    console.log('🧩 Creating database...');
    await connection.execute('CREATE DATABASE IF NOT EXISTS attendance_system');
    console.log('✅ Database attendance_system created');

    await connection.end();
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'attendance_system',
      port: 3306
    });
    console.log('✅ Connected to attendance_system database');

    console.log('🧹 Dropping existing tables...');
    await connection.execute('DROP TABLE IF EXISTS attendance');
    await connection.execute('DROP TABLE IF EXISTS sessions');
    await connection.execute('DROP TABLE IF EXISTS enrollments');
    await connection.execute('DROP TABLE IF EXISTS teacher_grade_levels');
    await connection.execute('DROP TABLE IF EXISTS subjects');
    await connection.execute('DROP TABLE IF EXISTS users');

    console.log('📝 Creating users table...');
    await connection.execute(`
      CREATE TABLE users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id VARCHAR(20) UNIQUE,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('student', 'teacher', 'admin') NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        grade_level VARCHAR(20),
        student_qr_code VARCHAR(255) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('📝 Creating subjects table...');
    await connection.execute(`
      CREATE TABLE subjects (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        teacher_id INT NOT NULL,
        semester VARCHAR(20),
        class_start_time TIME,
        class_end_time TIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('📝 Creating teacher_grade_levels table...');
    await connection.execute(`
      CREATE TABLE teacher_grade_levels (
        id INT PRIMARY KEY AUTO_INCREMENT,
        teacher_id INT NOT NULL,
        grade_level VARCHAR(20) NOT NULL,
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_teacher_grade (teacher_id, grade_level)
      )
    `);

    console.log('📝 Creating enrollments table...');
    await connection.execute(`
      CREATE TABLE enrollments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        subject_id INT NOT NULL,
        qr_code_data VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        UNIQUE KEY unique_enrollment (student_id, subject_id)
      )
    `);

    console.log('📝 Creating sessions table...');
    await connection.execute(`
      CREATE TABLE sessions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        subject_id INT NOT NULL,
        session_date DATE NOT NULL,
        start_time TIME,
        end_time TIME,
        status ENUM('scheduled', 'active', 'completed') DEFAULT 'scheduled',
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    console.log('📝 Creating attendance table...');
    await connection.execute(`
      CREATE TABLE attendance (
        id INT PRIMARY KEY AUTO_INCREMENT,
        session_id INT NOT NULL,
        student_id INT NOT NULL,
        start_scan_time TIMESTAMP NULL,
        start_status ENUM('on_time', 'late', 'missing') DEFAULT NULL,
        end_scan_time TIMESTAMP NULL,
        end_status ENUM('on_time', 'late', 'missing') DEFAULT NULL,
        status ENUM('present', 'late', 'absent') DEFAULT 'present',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_attendance (session_id, student_id)
      )
    `);

    console.log('✅ All tables created');

    console.log('🌱 Inserting users...');
    await connection.execute(`
      INSERT INTO users (id, student_id, email, password_hash, role, full_name, grade_level) VALUES 
      (1, NULL, 'admin@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'System Admin', NULL),
      (2, NULL, 'teacher@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher', 'Ms. Teacher', NULL),
      (3, 'S001', 'student@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student', 'John Student', '10'),
      (4, 'S002', 'alice@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student', 'Alice Johnson', '10'),
      (5, 'S003', 'bob@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student', 'Bob Smith', '10'),
      (6, 'S004', 'carol@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student', 'Carol White', '11'),
      (7, 'S005', 'david@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student', 'David Brown', '11')
    `);

    console.log('🌱 Inserting subjects...');
    await connection.execute(`
      INSERT INTO subjects (id, name, teacher_id, class_start_time, class_end_time) VALUES 
      (1, 'Math 101', 2, '09:00:00', '10:30:00'),
      (2, 'Physics 101', 2, '11:00:00', '12:30:00'),
      (3, 'English 101', 2, '14:00:00', '15:30:00'),
      (4, 'Chemistry 101', 2, '08:00:00', '09:30:00'),
      (5, 'Biology 101', 2, '13:00:00', '14:30:00')
    `);

    console.log('🌱 Inserting teacher grade levels...');
    await connection.execute(`
      INSERT INTO teacher_grade_levels (teacher_id, grade_level) VALUES (2, '10'), (2, '11')
    `);

    console.log('🌱 Inserting enrollments...');
    await connection.execute(`
      INSERT INTO enrollments (student_id, subject_id, qr_code_data) VALUES 
      (3, 1, '{"studentId":"S001","subjectId":1}'),
      (4, 1, '{"studentId":"S002","subjectId":1}'),
      (5, 1, '{"studentId":"S003","subjectId":1}'),
      (6, 1, '{"studentId":"S004","subjectId":1}'),
      (7, 1, '{"studentId":"S005","subjectId":1}'),
      (3, 2, '{"studentId":"S001","subjectId":2}'),
      (4, 2, '{"studentId":"S002","subjectId":2}'),
      (5, 3, '{"studentId":"S003","subjectId":3}'),
      (6, 3, '{"studentId":"S004","subjectId":3}'),
      (7, 3, '{"studentId":"S005","subjectId":3}')
    `);

    console.log('🌱 Inserting sessions...');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    await connection.query(`INSERT INTO sessions (subject_id, session_date, start_time, end_time, status, created_by) VALUES 
      (1, '${yesterdayStr}', '09:00:00', '10:30:00', 'completed', 2),
      (1, '${todayStr}', '09:00:00', '10:30:00', 'completed', 2),
      (2, '${yesterdayStr}', '11:00:00', '12:30:00', 'completed', 2),
      (3, '${todayStr}', '14:00:00', '15:30:00', 'completed', 2)`);

    console.log('🌱 Inserting attendance records...');
    const [sessions] = await connection.execute('SELECT id, subject_id FROM sessions ORDER BY id');
    
    for (const session of sessions) {
      const [enrollments] = await connection.execute(
        'SELECT student_id FROM enrollments WHERE subject_id = ?',
        [session.subject_id]
      );

      for (const enrollment of enrollments) {
        const rand = Math.random();
        let status, startScanTime, endScanTime;

        if (rand < 0.7) {
          status = 'present';
          startScanTime = '09:15:00';
          endScanTime = '10:25:00';
        } else if (rand < 0.85) {
          status = 'late';
          startScanTime = '09:25:00';
          endScanTime = '10:25:00';
        } else {
          status = 'absent';
          startScanTime = null;
          endScanTime = null;
        }

        if (status === 'absent') {
          await connection.execute(
            'INSERT INTO attendance (session_id, student_id, status) VALUES (?, ?, ?)',
            [session.id, enrollment.student_id, status]
          );
        } else {
          await connection.execute(
            'INSERT INTO attendance (session_id, student_id, start_scan_time, end_scan_time, status) VALUES (?, ?, ?, ?, ?)',
            [session.id, enrollment.student_id, startScanTime, endScanTime, status]
          );
        }
      }
    }

    console.log('✅ Verifying data...');
    const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
    const [subjectCount] = await connection.execute('SELECT COUNT(*) as count FROM subjects');
    const [sessionCount] = await connection.execute('SELECT COUNT(*) as count FROM sessions');
    const [attendanceCount] = await connection.execute('SELECT COUNT(*) as count FROM attendance');

    console.log(`✅ Users: ${userCount[0].count}`);
    console.log(`✅ Subjects: ${subjectCount[0].count}`);
    console.log(`✅ Sessions: ${sessionCount[0].count}`);
    console.log(`✅ Attendance: ${attendanceCount[0].count}`);

    console.log('\n🎉 Database setup complete!');
    console.log('\n📋 Test Credentials:');
    console.log('   Admin: admin@example.com / password');
    console.log('   Teacher: teacher@example.com / password');
    console.log('   Student: student@example.com / password');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error(error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();
