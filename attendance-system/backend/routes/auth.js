const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const { pool } = require('../database'); // Import pool from database
const { auth, roleAuth } = require('../middleware/auth');

const router = express.Router();

// Helper to get pool from server context or use local
async function getConnection() {
  return await pool.getConnection();
}

// Register - Admin only
router.post('/register', auth, roleAuth(['admin']), async (req, res) => {
  try {
    const { student_id, email, role, full_name, grade_level } = req.body;
    
    if (!email || !role || !full_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const connection = await getConnection();
    
    // Check if user exists
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE email = ? OR student_id = ?',
      [email, student_id || '']
    );
    
    if (existing.length > 0) {
      connection.release();
      return res.status(400).json({ error: 'User already exists' });
    }

    // Generate default password for student
    const defaultPassword = 'student123';
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(defaultPassword, salt);

    // Insert user
    const [result] = await connection.execute(
      'INSERT INTO users (student_id, email, password_hash, role, full_name, grade_level) VALUES (?, ?, ?, ?, ?, ?)',
      [student_id || null, email, password_hash, role, full_name, grade_level || null]
    );

    connection.release();

    // Generate JWT
    const token = jwt.sign(
      { id: result.insertId, role, student_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: result.insertId, email, role, full_name, student_id }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const connection = await getConnection();
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    connection.release();

    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const validPass = await bcrypt.compare(password, user.password_hash);
    
    if (!validPass) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, student_id: user.student_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name, student_id: user.student_id }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: list teachers
router.get('/teachers', auth, roleAuth(['admin']), async (req, res) => {
  try {
    const connection = await getConnection();
    const [teachers] = await connection.execute(
      'SELECT id, email, full_name, student_id FROM users WHERE role = ? ORDER BY full_name',
      ['teacher']
    );
    connection.release();
    res.json(teachers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: edit teacher
router.put('/teachers/:id', auth, roleAuth(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { email, full_name, password } = req.body;

    const connection = await getConnection();
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE id = ? AND role = ?',
      [id, 'teacher']
    );

    if (existing.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const updates = [];
    const values = [];

    if (email) {
      updates.push('email = ?');
      values.push(email);
    }
    if (full_name) {
      updates.push('full_name = ?');
      values.push(full_name);
    }
    if (password) {
      const password_hash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      values.push(password_hash);
    }

    if (updates.length === 0) {
      connection.release();
      return res.status(400).json({ error: 'No update values provided' });
    }

    values.push(id);
    await connection.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ? AND role = 'teacher'`,
      values
    );

    connection.release();
    res.json({ message: 'Teacher updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: delete teacher
router.delete('/teachers/:id', auth, roleAuth(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id, 10) === req.user.id) {
      return res.status(400).json({ error: 'Admin cannot delete themselves' });
    }

    const connection = await getConnection();
    const [result] = await connection.execute(
      'DELETE FROM users WHERE id = ? AND role = ?',
      [id, 'teacher']
    );
    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Teacher not found or cannot be deleted' });
    }

    res.json({ message: 'Teacher deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: list students
router.get('/students', auth, roleAuth(['admin']), async (req, res) => {
  try {
    const connection = await getConnection();
    const [students] = await connection.execute(
      'SELECT id, email, full_name, student_id, grade_level FROM users WHERE role = ? ORDER BY full_name',
      ['student']
    );
    connection.release();
    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: edit student
router.put('/students/:id', auth, roleAuth(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { email, full_name, student_id, grade_level, password } = req.body;

    const connection = await getConnection();
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE id = ? AND role = ?',
      [id, 'student']
    );

    if (existing.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Student not found' });
    }

    const updates = [];
    const values = [];

    if (email) {
      updates.push('email = ?');
      values.push(email);
    }
    if (full_name) {
      updates.push('full_name = ?');
      values.push(full_name);
    }
    if (student_id) {
      updates.push('student_id = ?');
      values.push(student_id);
    }
    if (grade_level) {
      updates.push('grade_level = ?');
      values.push(grade_level);
    }
    if (password) {
      const password_hash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      values.push(password_hash);
    }

    if (updates.length === 0) {
      connection.release();
      return res.status(400).json({ error: 'No update values provided' });
    }

    values.push(id);
    await connection.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ? AND role = 'student'`,
      values
    );

    connection.release();
    res.json({ message: 'Student updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: delete student
router.delete('/students/:id', auth, roleAuth(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await getConnection();
    const [result] = await connection.execute(
      'DELETE FROM users WHERE id = ? AND role = ?',
      [id, 'student']
    );
    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Student not found or cannot be deleted' });
    }

    res.json({ message: 'Student deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: register student + generate ONE single QR code for all subjects
router.post('/register-student-simple', auth, roleAuth(['admin']), async (req, res) => {
  try {
    const { first_name, last_name, subject_id, grade_level } = req.body;

    if (!first_name || !last_name || !subject_id || !grade_level) {
      return res.status(400).json({ error: 'Missing required fields: first_name, last_name, subject_id, grade_level' });
    }

    const connection = await getConnection();

    // Verify subject exists
    const [subjectCheck] = await connection.execute(
      'SELECT id FROM subjects WHERE id = ?',
      [subject_id]
    );
    if (subjectCheck.length === 0) {
      connection.release();
      return res.status(400).json({ error: 'Invalid subject/course selected' });
    }

    const timestamp = Date.now();
    const student_id = `S${timestamp}`;
    const email = `${student_id.toLowerCase()}@student.system`;
    const full_name = `${first_name} ${last_name}`;

    const defaultPassword = 'student123';
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(defaultPassword, salt);

    const studentQrCode = JSON.stringify({ studentId: student_id });

    const [result] = await connection.execute(
      'INSERT INTO users (student_id, email, password_hash, role, full_name, grade_level, student_qr_code) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [student_id, email, password_hash, 'student', full_name, grade_level, studentQrCode]
    );

    const userId = result.insertId;

    await connection.execute(
      'INSERT INTO enrollments (student_id, subject_id, qr_code_data) VALUES (?, ?, ?)',
      [userId, subject_id, studentQrCode]
    );

    connection.release();

    const qrImage = await QRCode.toDataURL(studentQrCode, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.status(201).json({
      message: 'Student registered with single QR code for all subjects',
      student: { id: userId, student_id, full_name, email, grade_level },
      qrData: studentQrCode,
      qrImage
    });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Duplicate entry detected. Please try again.' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: get student profile with enrolled subjects
router.get('/students/:id/profile', auth, roleAuth(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await getConnection();

    const [studentRows] = await connection.execute(
      'SELECT id, email, full_name, student_id, grade_level, role FROM users WHERE id = ? AND role = "student"',
      [id]
    );

    if (studentRows.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = studentRows[0];

    const [subjects] = await connection.execute(
      `SELECT s.id, s.name, s.class_start_time, s.class_end_time
       FROM enrollments e
       JOIN subjects s ON s.id = e.subject_id
       WHERE e.student_id = ?
       ORDER BY s.name`,
      [student.id]
    );

    const [enrollmentSubjectIds] = await connection.execute(
      'SELECT subject_id FROM enrollments WHERE student_id = ? ORDER BY subject_id',
      [student.id]
    );

    connection.release();

    res.json({
      student,
      enrolledSubjects: subjects,
      enrolledCount: subjects.length,
      debugEnrollmentSubjectIds: enrollmentSubjectIds.map(r => r.subject_id),
      rawEnrollmentCount: enrollmentSubjectIds.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: register student + enroll in multiple subjects
router.post('/register-student-multi-subject', auth, roleAuth(['admin']), async (req, res) => {
  try {
    const { first_name, last_name, subject_ids, grade_level, email, student_id } = req.body;

    if (!first_name || !last_name || !Array.isArray(subject_ids) || subject_ids.length === 0 || !grade_level) {
      return res.status(400).json({
        error: 'Missing required fields: first_name, last_name, subject_ids (array), grade_level',
      });
    }

    // Email behavior (align with UI request):
    // - If client doesn't provide email (or it's blank), derive it from student_id.
    // - If client provides email, use it as-is.
    // This keeps old behavior compatible while ensuring student_id-based matching.
    if (!student_id || !String(student_id).trim()) {
      return res.status(400).json({
        error: 'Missing required fields: student_id',
      });
    }

    const derivedEmail = (email && String(email).trim())
      ? String(email).trim()
      : `${String(student_id).toLowerCase()}@student.system`;




    const connection = await getConnection();

    // Normalize + dedupe subject IDs early (prevents duplicate/mismatched numeric/string ids)
    const normalizedSubjectIds = Array.from(new Set(subject_ids.map((sid) => Number(sid)).filter((sid) => Number.isFinite(sid))));

    // Verify all subjects exist
    const [subjectRows] = await connection.execute(
      `SELECT id FROM subjects WHERE id IN (${normalizedSubjectIds.map(() => '?').join(',')})`,
      normalizedSubjectIds
    );

    if (subjectRows.length !== normalizedSubjectIds.length) {
      connection.release();
      return res.status(400).json({ error: 'One or more invalid subject/course selected' });
    }

    const full_name = `${first_name} ${last_name}`;

    const defaultPassword = 'student123';
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(defaultPassword, salt);

    const studentQrCode = JSON.stringify({ studentId: student_id });


    // Insert student
    const [result] = await connection.execute(
      'INSERT INTO users (student_id, email, password_hash, role, full_name, grade_level, student_qr_code) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [student_id, derivedEmail, password_hash, 'student', full_name, grade_level, studentQrCode]
    );

    const userId = result.insertId;

    // Enroll student in all subjects (transaction)
    await connection.beginTransaction();
    const enrollmentInsertResults = [];
    try {
      for (const sid of normalizedSubjectIds) {
        try {
          const [insRes] = await connection.execute(
            `INSERT INTO enrollments (student_id, subject_id, qr_code_data)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE qr_code_data = VALUES(qr_code_data)`,
            [userId, sid, studentQrCode]
          );
          enrollmentInsertResults.push({ sid, affectedRows: insRes?.affectedRows ?? null, warning: null });
        } catch (insertErr) {
          enrollmentInsertResults.push({
            sid,
            affectedRows: null,
            warning: insertErr?.message || String(insertErr),
          });
          throw insertErr;
        }
      }
      await connection.commit();
    } catch (e) {
      await connection.rollback();
      // rethrow to be handled by outer catch
      throw e;
    }


    // Re-verify checks
    const [enrollmentCheck] = await connection.execute(
      'SELECT subject_id FROM enrollments WHERE student_id = ? ORDER BY subject_id',
      [userId]
    );

    const enrolledSubjectIds = enrollmentCheck.map((r) => Number(r.subject_id));
    const missing = normalizedSubjectIds.filter((sid) => !enrolledSubjectIds.includes(sid));

    // If missing, it's not a typing/numeric problem anymore; it means DB didn't insert all rows.
    // Return additional diagnostics so we can see what DB thinks.
    if (missing.length > 0) {
      // Capture DB structure to explain why duplicates/rows disappear
      try {
        const [indexes] = await connection.execute('SHOW INDEX FROM enrollments');
        const [createRows] = await connection.execute('SHOW CREATE TABLE enrollments');
        const createStmt = createRows?.[0]?.['Create Table'] || createRows?.[0]?.['Create Table'] || null;

        return res.status(400).json({
          error: 'Enrollment incomplete',
          studentId: userId,
          requestedSubjectIds: normalizedSubjectIds,
          enrolledSubjectIds,
          missing,
          enrollmentCountInDb: enrollmentCheck.length,
          enrollmentInsertResults,
          dbDebug: {
            indexes,
            createStmt,
          },
        });
      } finally {
        connection.release();
      }
    }

    connection.release();

    const qrImage = await QRCode.toDataURL(studentQrCode, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      }
    });

    res.status(201).json({
      message: 'Student registered with ONE QR code for ALL selected subjects',
      student: { id: userId, student_id, full_name, email, grade_level },
      qrData: studentQrCode,
      qrImage,
      enrolled_subject_ids: normalizedSubjectIds
    });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Duplicate entry detected. Please try again.' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Teacher: get own profile
router.get('/teachers/me', auth, roleAuth(['teacher']), async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      'SELECT id, email, full_name, student_id, role, grade_level FROM users WHERE id = ? AND role = "teacher"',
      [req.user.id]
    );
    connection.release();

    if (rows.length === 0) return res.status(404).json({ error: 'Teacher not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Teacher: change own password
router.put('/teachers/me/password', auth, roleAuth(['teacher']), async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'current_password and new_password are required' });
    }

    const connection = await getConnection();
    const [rows] = await connection.execute(
      'SELECT id, password_hash FROM users WHERE id = ? AND role = "teacher"',
      [req.user.id]
    );

    if (rows.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const validPass = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!validPass) {
      connection.release();
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await connection.execute(
      'UPDATE users SET password_hash = ? WHERE id = ? AND role = "teacher"',
      [password_hash, req.user.id]
    );

    connection.release();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
