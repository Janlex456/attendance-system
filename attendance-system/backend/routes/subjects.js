const express = require('express');
const mysql = require('mysql2/promise');
const { pool } = require('../database');
const { auth, roleAuth } = require('../middleware/auth');

const router = express.Router();

// Middleware: Teacher/Admin only
router.use(auth, roleAuth(['teacher', 'admin']));

// Create subject
router.post('/', async (req, res) => {
  try {
    const { name, semester = null, class_start_time, class_end_time, teacher_id } = req.body;
    const connection = await pool.getConnection();

    // Admins can assign a specific teacher; otherwise default to creator
    const targetTeacherId = (req.user.role === 'admin' && teacher_id)
      ? teacher_id
      : req.user.id;

    const [result] = await connection.execute(
      'INSERT INTO subjects (name, teacher_id, semester, class_start_time, class_end_time) VALUES (?, ?, ?, ?, ?)',
      [name, targetTeacherId, semester, class_start_time, class_end_time]
    );

    connection.release();
    res.status(201).json({ id: result.insertId, name, semester, class_start_time, class_end_time, teacher_id: targetTeacherId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all subjects (for teachers/admins)
router.get('/', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [subjects] = await connection.execute(
      'SELECT * FROM subjects'
    );
    connection.release();
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get enrolled subjects for student
router.get('/enrolled/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const connection = await pool.getConnection();
    const [subjects] = await connection.execute(
      `SELECT s.* FROM subjects s
       JOIN enrollments e ON s.id = e.subject_id
       WHERE e.student_id = ?`,
      [studentId]
    );
    connection.release();
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get teacher's subjects
router.get('/my', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [subjects] = await connection.execute(
      'SELECT * FROM subjects WHERE teacher_id = ?',
      [req.user.id]
    );
    connection.release();
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get grade levels assigned to current teacher
router.get('/teacher/grade-levels', async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [grades] = await connection.execute(
      'SELECT grade_level FROM teacher_grade_levels WHERE teacher_id = ? ORDER BY grade_level',
      [req.user.id]
    );

    connection.release();
    res.json(grades.map(row => row.grade_level));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: get grade levels for a specific teacher
router.get('/admin/grade-levels/:teacherId', roleAuth(['admin']), async (req, res) => {
  try {
    const { teacherId } = req.params;
    const connection = await pool.getConnection();

    const [grades] = await connection.execute(
      'SELECT grade_level FROM teacher_grade_levels WHERE teacher_id = ? ORDER BY grade_level',
      [teacherId]
    );

    connection.release();
    res.json(grades.map(row => row.grade_level));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: assign a grade level to a teacher
router.post('/admin/grade-levels/:teacherId', roleAuth(['admin']), async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { grade_level } = req.body;

    if (!grade_level) {
      return res.status(400).json({ error: 'grade_level is required' });
    }

    const connection = await pool.getConnection();

    const [result] = await connection.execute(
      'INSERT INTO teacher_grade_levels (teacher_id, grade_level) VALUES (?, ?)',
      [teacherId, grade_level]
    );

    connection.release();
    res.status(201).json({ message: 'Grade level assigned', teacher_id: teacherId, grade_level });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Grade level already assigned to this teacher' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Admin: remove a grade level from a teacher
router.delete('/admin/grade-levels/:teacherId/:gradeLevel', roleAuth(['admin']), async (req, res) => {
  try {
    const { teacherId, gradeLevel } = req.params;
    const connection = await pool.getConnection();

    const [result] = await connection.execute(
      'DELETE FROM teacher_grade_levels WHERE teacher_id = ? AND grade_level = ?',
      [teacherId, gradeLevel]
    );

    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json({ message: 'Grade level removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get students enrolled in a subject
router.get('/:subjectId/students', async (req, res) => {
  try {
    const { subjectId } = req.params;
    const connection = await pool.getConnection();
    
    const [students] = await connection.execute(
      'SELECT u.id, u.student_id, u.full_name, u.grade_level FROM enrollments e ' +
      'JOIN users u ON e.student_id = u.id ' +
      'WHERE e.subject_id = ? AND u.role = "student"',
      [subjectId]
    );
    
    connection.release();
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update subject (edit)
router.put('/:id', roleAuth(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, semester, class_start_time, class_end_time } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const connection = await pool.getConnection();
    
    const [result] = await connection.execute(
      'UPDATE subjects SET name = ?, semester = ?, class_start_time = ?, class_end_time = ? WHERE id = ?',
      [name || null, semester || null, class_start_time || null, class_end_time || null, id]
    );
    
    if (result.affectedRows === 0) {
      connection.release();
      return res.status(404).json({ error: 'Subject not found' });
    }
    
    connection.release();
    res.json({ message: 'Subject updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete subject (admin only)
router.delete('/:id', roleAuth(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    
    const [result] = await connection.execute(
      'DELETE FROM subjects WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      connection.release();
      return res.status(404).json({ error: 'Subject not found' });
    }
    
    connection.release();
    res.json({ message: 'Subject deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;

