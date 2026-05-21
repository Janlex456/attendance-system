const express = require('express');
const { createObjectCsvWriter } = require('csv-writer');
const mysql = require('mysql2/promise');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { pool } = require('../database');
const { auth, roleAuth } = require('../middleware/auth');

const router = express.Router();
router.use(auth, roleAuth(['teacher', 'admin']));

// Get filtered attendance report for teacher
router.get('/filtered/search', async (req, res) => {
  try {
    const { subjectId, gradeLevel, startDate, endDate, status } = req.query;
    const connection = await pool.getConnection();
    
    let query = `
      SELECT 
        s.name as subject,
        ses.session_date,
        ses.start_time,
        u.full_name,
        u.student_id,
        u.grade_level,
        a.start_scan_time,
        a.end_scan_time,
        CASE
          WHEN a.start_scan_time IS NOT NULL AND a.end_scan_time IS NULL THEN 'time_out_missing'
          WHEN a.start_scan_time IS NULL THEN 'time_in_missing'
          ELSE NULL
        END AS timeout_reason,
        COALESCE(a.end_scan_time, a.start_scan_time) as scan_time,

        /*
          Status rules:
          - If TIME IN never scanned => absent
          - If TIME IN scanned but TIME OUT missing => absent
          - Otherwise use stored attendance.status (present/late)
        */
        CASE
          WHEN a.start_scan_time IS NULL THEN 'absent'
          WHEN a.start_scan_time IS NOT NULL AND a.end_scan_time IS NULL THEN 'absent'
          WHEN a.status IS NULL THEN 'absent'
          ELSE a.status
        END AS status,

        a.session_id

      FROM sessions ses

       JOIN subjects s ON ses.subject_id = s.id
       JOIN enrollments e ON e.subject_id = s.id
       JOIN users u ON u.id = e.student_id
       LEFT JOIN attendance a ON a.session_id = ses.id AND a.student_id = u.id
       WHERE 1=1
    `;
    
    const params = [];
    
    // Filter by subject (for teacher, only their subjects)
    if (subjectId) {
      query += ' AND ses.subject_id = ?';
      params.push(subjectId);
    } else if (req.user.role === 'teacher') {
      query += ' AND s.teacher_id = ?';
      params.push(req.user.id);
    }
    
    // Filter by grade level
    if (gradeLevel) {
      query += ' AND u.grade_level = ?';
      params.push(gradeLevel);
    }
    
    // Filter by date range
    if (startDate) {
      query += ' AND ses.session_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND ses.session_date <= ?';
      params.push(endDate);
    }
    
    // Filter by status
    if (status) {
      // Keep this single-line to avoid string literal issues
      query += ' AND (CASE ' +
        'WHEN a.start_scan_time IS NULL THEN "absent" ' +
        'WHEN a.status IS NULL THEN "absent" ' +
        'ELSE a.status ' +
      'END) = ?';
      params.push(status);
    }


    
    query += ' ORDER BY ses.session_date DESC, a.start_scan_time DESC';

    
    const [attendance] = await connection.execute(query, params);
    connection.release();
    
if (req.query.format === 'csv') {
        // CSV response
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${new Date().toISOString().split('T')[0]}.csv`);


      const csvWriter = createObjectCsvWriter({
        header: [
          { id: 'subject', title: 'Subject' },
          { id: 'session_date', title: 'Date' },
          { id: 'start_time', title: 'Start Time' },
          { id: 'full_name', title: 'Student Name' },
          { id: 'student_id', title: 'Student ID' },
          { id: 'grade_level', title: 'Grade' },
          { id: 'start_scan_time', title: 'Time In' },
          { id: 'end_scan_time', title: 'Time Out' },
          { id: 'scan_time', title: 'Scan Time' },
          { id: 'timeout_reason', title: 'Timeout Reason' },
          { id: 'status', title: 'Status' }
        ],
        path: undefined // stream
      });

      const records = attendance.map(row => ({
        subject: row.subject,
        session_date: row.session_date,
        start_time: row.start_time,
        full_name: row.full_name,
        student_id: row.student_id,
        grade_level: row.grade_level,
        scan_time: row.scan_time,
        timeout_reason: row.timeout_reason,
        status: row.status
      }));

      const csvString = await csvWriter.writeRecords(records);
      res.send(csvString);
    } else if (req.query.format === 'xlsx') {
      // Excel (.xlsx) response
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Attendance System';
      workbook.created = new Date();
      
      const worksheet = workbook.addWorksheet('Attendance Report');
      
      // Add headers
      worksheet.columns = [
        { header: 'Subject', key: 'subject', width: 20 },
        { header: 'Date', key: 'session_date', width: 12 },
        { header: 'Start Time', key: 'start_time', width: 10 },
        { header: 'Student Name', key: 'full_name', width: 20 },
        { header: 'Student ID', key: 'student_id', width: 12 },
        { header: 'Grade', key: 'grade_level', width: 10 },
        { header: 'Time In', key: 'start_scan_time', width: 15 },
        { header: 'Time Out', key: 'end_scan_time', width: 15 },
        { header: 'Status', key: 'status', width: 10 }
      ];
      
      // Add data rows
      attendance.forEach(row => {
        worksheet.addRow({
          subject: row.subject,
          session_date: row.session_date,
          start_time: row.start_time,
          full_name: row.full_name,
          student_id: row.student_id,
          grade_level: row.grade_level,
          start_scan_time: row.start_scan_time,
          end_scan_time: row.end_scan_time,
          status: row.status
        });
      });
      
      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '7CB342' }
      };
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      await workbook.xlsx.write(res);
      res.end();
    } else if (req.query.format === 'pdf') {
      // PDF response
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${new Date().toISOString().split('T')[0]}.pdf`);
      
      doc.pipe(res);
      
      // Title
      doc.fontSize(18).text('Attendance Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(2);
      
      // Table data
      const tableTop = 150;
      const columns = {
        subject: 50,
        date: 150,
        studentName: 200,
        studentId: 280,
        grade: 330,
        timeIn: 380,
        timeOut: 440,
        status: 500
      };
      
      // Header row
      doc.fontSize(9).font('Helvetica-Bold');
      doc.fillColor('#7CB342');
      doc.text('Subject', 50, tableTop);
      doc.text('Date', columns.date, tableTop);
      doc.text('Student Name', columns.studentName, tableTop);
      doc.text('ID', columns.studentId, tableTop);
      doc.text('Grade', columns.grade, tableTop);
      doc.text('Time In', columns.timeIn, tableTop);
      doc.text('Time Out', columns.timeOut, tableTop);
      doc.text('Status', columns.status, tableTop);
      
      // Data rows
      doc.fillColor('#000000').font('Helvetica');
      let y = tableTop + 20;
      
      attendance.forEach((row, index) => {
        if (y > 750) {
          doc.addPage();
          y = 50;
        }
        
        doc.text(String(row.subject || ''), 50, y);
        doc.text(String(row.session_date || ''), columns.date, y);
        doc.text(String(row.full_name || ''), columns.studentName, y);
        doc.text(String(row.student_id || ''), columns.studentId, y);
        doc.text(String(row.grade_level || ''), columns.grade, y);
        doc.text(row.start_scan_time ? String(row.start_scan_time).substring(11, 19) : '-', columns.timeIn, y);
        doc.text(row.end_scan_time ? String(row.end_scan_time).substring(11, 19) : '-', columns.timeOut, y);
        doc.text(String(row.status || ''), columns.status, y);
        
        y += 20;
      });
      
      doc.end();
    } else {
      res.json(attendance);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get attendance report for subject/session
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const connection = await pool.getConnection();

    const [attendance] = await connection.execute(
      `SELECT 
        s.name as subject, 
        ses.session_date, 
        ses.start_time,
        u.full_name, 
        u.student_id, 
        u.grade_level,
        COALESCE(a.end_scan_time, a.start_scan_time) as scan_time,
        a.status


       FROM attendance a 
       JOIN users u ON a.student_id = u.id
       JOIN sessions ses ON a.session_id = ses.id
       JOIN subjects s ON ses.subject_id = s.id
       WHERE a.session_id = ?
       ORDER BY a.start_scan_time`,

      [sessionId]
    );

    connection.release();

    if (req.query.format === 'csv') {
      // CSV response
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=attendance_${sessionId}.csv`);

      const csvWriter = createObjectCsvWriter({
        header: [
          { id: 'subject', title: 'Subject' },
          { id: 'session_date', title: 'Date' },
          { id: 'start_time', title: 'Start Time' },
          { id: 'full_name', title: 'Student Name' },
          { id: 'student_id', title: 'Student ID' },
          { id: 'grade_level', title: 'Grade' },
          { id: 'scan_time', title: 'Scan Time' },
          { id: 'status', title: 'Status' }
        ],
        path: undefined // stream
      });

      const records = attendance.map(row => ({
        subject: row.subject,
        session_date: row.session_date,
        start_time: row.start_time,
        full_name: row.full_name,
        student_id: row.student_id,
        grade_level: row.grade_level,
        scan_time: row.scan_time,
        timeout_reason: row.timeout_reason,
        status: row.status
      }));

      const csvString = await csvWriter.writeRecords(records);
      res.send(csvString);
    } else {
      res.json(attendance);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
