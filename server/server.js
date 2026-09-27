require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { db, resetDatabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} [${res.statusCode}] - ${duration}ms`);
  });
  next();
});

// Helper: Auto-generate student ID
function generateStudentId() {
  const year = new Date().getFullYear();
  const row = db.prepare(`
    SELECT student_id FROM students
    WHERE student_id LIKE ?
    ORDER BY id DESC LIMIT 1
  `).get(`STU-${year}-%`);

  let nextNum = 1;
  if (row && row.student_id) {
    const parts = row.student_id.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  } else {
    const countRow = db.prepare('SELECT COUNT(*) as total FROM students').get();
    nextNum = (countRow ? countRow.total : 0) + 1;
  }

  // Ensure uniqueness
  while (true) {
    const candidate = `STU-${year}-${String(nextNum).padStart(4, '0')}`;
    const exists = db.prepare('SELECT id FROM students WHERE student_id = ?').get(candidate);
    if (!exists) return candidate;
    nextNum++;
  }
}

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ─── Stats ────────────────────────────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  try {
    const totalRow = db.prepare('SELECT COUNT(*) as total FROM students').get();
    const activeRow = db.prepare("SELECT COUNT(*) as active FROM students WHERE status = 'Active'").get();
    const avgRow = db.prepare('SELECT AVG(gpa) as avgGpa FROM students').get();

    const deptRows = db.prepare(`
      SELECT department, COUNT(*) as count
      FROM students
      GROUP BY department
      ORDER BY count DESC
    `).all();

    const statusRows = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM students
      GROUP BY status
    `).all();

    const ALL_STATUSES = ['Active', 'On Leave', 'Suspended', 'Graduated'];
    const statusMap = Object.fromEntries(statusRows.map(r => [r.status, r.count]));
    const statuses = ALL_STATUSES.map(s => ({
      status: s,
      count: statusMap[s] || 0,
    }));

    const ALL_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];
    const yearRows = db.prepare(`
      SELECT year_level, COUNT(*) as count
      FROM students
      GROUP BY year_level
    `).all();
    const yearMap = Object.fromEntries(yearRows.map(r => [r.year_level, r.count]));
    const yearLevels = ALL_YEARS.map(y => ({
      year_level: y,
      count: yearMap[y] || 0,
    }));

    res.json({
      success: true,
      stats: {
        total: totalRow ? totalRow.total : 0,
        active: activeRow ? activeRow.active : 0,
        avgGpa: avgRow && avgRow.avgGpa !== null ? Number(Number(avgRow.avgGpa).toFixed(2)) : 0,
        departments: deptRows,
        statuses,
        yearLevels,
      },
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

// ─── Students List (Search, Filter, Sort, Pagination) ────────────────────────
app.get('/api/students', (req, res) => {
  try {
    const {
      q,
      department,
      year_level,
      status,
      sort_by = 'id',
      sort_order = 'DESC',
      page = 1,
      limit = 10,
    } = req.query;

    const allowedSortFields = [
      'id', 'student_id', 'first_name', 'last_name',
      'email', 'department', 'year_level', 'gpa', 'status', 'created_at',
    ];
    const safeSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'id';
    const safeOrder = String(sort_order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];

    if (q && q.trim()) {
      const term = `%${q.trim()}%`;
      conditions.push(`(
        first_name LIKE ? OR
        last_name LIKE ? OR
        email LIKE ? OR
        student_id LIKE ? OR
        phone LIKE ?
      )`);
      params.push(term, term, term, term, term);
    }

    if (department && department !== 'All') {
      conditions.push('department = ?');
      params.push(department);
    }

    if (year_level && year_level !== 'All') {
      conditions.push('year_level = ?');
      params.push(year_level);
    }

    if (status && status !== 'All') {
      conditions.push('status = ?');
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total matching records
    const countSql = `SELECT COUNT(*) as total FROM students ${whereClause}`;
    const totalRow = db.prepare(countSql).get(...params);
    const total = totalRow ? totalRow.total : 0;
    const totalPages = Math.max(1, Math.ceil(total / limitNum));

    // Data query
    const dataSql = `
      SELECT * FROM students
      ${whereClause}
      ORDER BY ${safeSortBy} ${safeOrder}
      LIMIT ? OFFSET ?
    `;
    const data = db.prepare(dataSql).all(...params, limitNum, offset);

    res.json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        totalPages,
        total,
        limit: limitNum,
      },
    });
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({ error: 'Failed to retrieve students' });
  }
});

// ─── Single Student ──────────────────────────────────────────────────────────
app.get('/api/students/:id', (req, res) => {
  try {
    const { id } = req.params;
    const student = db.prepare('SELECT * FROM students WHERE id = ? OR student_id = ?').get(id, id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json({ success: true, data: student, ...student });
  } catch (err) {
    console.error('Error fetching student:', err);
    res.status(500).json({ error: 'Failed to retrieve student' });
  }
});

// ─── Create Student ──────────────────────────────────────────────────────────
app.post('/api/students', (req, res) => {
  try {
    let {
      student_id,
      first_name,
      last_name,
      email,
      phone = '',
      gender = 'Other',
      dob = '',
      department,
      year_level,
      gpa = 0.0,
      status = 'Active',
    } = req.body;

    // Validation
    if (!first_name?.trim() || !last_name?.trim() || !email?.trim() || !department?.trim() || !year_level?.trim()) {
      return res.status(400).json({
        error: 'First name, last name, email, department, and year level are required.',
      });
    }

    first_name = first_name.trim();
    last_name = last_name.trim();
    email = email.trim().toLowerCase();

    // Validate email format
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    // Check duplicate email
    const existingEmail = db.prepare('SELECT id FROM students WHERE LOWER(email) = ?').get(email);
    if (existingEmail) {
      return res.status(409).json({ error: 'A student with this email address already exists.' });
    }

    // Auto-generate or validate student_id
    if (!student_id || !student_id.trim()) {
      student_id = generateStudentId();
    } else {
      student_id = student_id.trim();
      const existingId = db.prepare('SELECT id FROM students WHERE student_id = ?').get(student_id);
      if (existingId) {
        return res.status(409).json({ error: 'A student with this Student ID already exists.' });
      }
    }

    // Parse GPA
    let numGpa = parseFloat(gpa);
    if (isNaN(numGpa) || numGpa < 0) numGpa = 0.0;
    if (numGpa > 4.0) numGpa = 4.0;
    numGpa = Number(numGpa.toFixed(2));

    const insertStmt = db.prepare(`
      INSERT INTO students (
        student_id, first_name, last_name, email, phone,
        gender, dob, department, year_level, gpa, status
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?
      )
    `);

    const info = insertStmt.run(
      student_id, first_name, last_name, email, phone ? phone.trim() : '',
      gender || 'Other', dob || '', department, year_level, numGpa, status || 'Active'
    );

    const newStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ success: true, data: newStudent });
  } catch (err) {
    console.error('Error creating student:', err);
    res.status(500).json({ error: 'Failed to create student: ' + err.message });
  }
});

// ─── Update Student ──────────────────────────────────────────────────────────
app.put('/api/students/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Student not found' });
    }

    let {
      student_id,
      first_name,
      last_name,
      email,
      phone = '',
      gender = 'Other',
      dob = '',
      department,
      year_level,
      gpa = 0.0,
      status = 'Active',
    } = req.body;

    if (!first_name?.trim() || !last_name?.trim() || !email?.trim() || !department?.trim() || !year_level?.trim()) {
      return res.status(400).json({
        error: 'First name, last name, email, department, and year level are required.',
      });
    }

    first_name = first_name.trim();
    last_name = last_name.trim();
    email = email.trim().toLowerCase();

    // Check duplicate email (excluding current student)
    const duplicateEmail = db.prepare('SELECT id FROM students WHERE LOWER(email) = ? AND id != ?').get(email, id);
    if (duplicateEmail) {
      return res.status(409).json({ error: 'Another student already has this email address.' });
    }

    student_id = student_id ? student_id.trim() : existing.student_id;
    const duplicateId = db.prepare('SELECT id FROM students WHERE student_id = ? AND id != ?').get(student_id, id);
    if (duplicateId) {
      return res.status(409).json({ error: 'Another student already has this Student ID.' });
    }

    let numGpa = parseFloat(gpa);
    if (isNaN(numGpa) || numGpa < 0) numGpa = 0.0;
    if (numGpa > 4.0) numGpa = 4.0;
    numGpa = Number(numGpa.toFixed(2));

    const updateStmt = db.prepare(`
      UPDATE students SET
        student_id = ?,
        first_name = ?,
        last_name = ?,
        email = ?,
        phone = ?,
        gender = ?,
        dob = ?,
        department = ?,
        year_level = ?,
        gpa = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    updateStmt.run(
      student_id, first_name, last_name, email, phone ? phone.trim() : '',
      gender || 'Other', dob || '', department, year_level, numGpa, status || 'Active',
      id
    );

    const updated = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error updating student:', err);
    res.status(500).json({ error: 'Failed to update student: ' + err.message });
  }
});

// ─── Patch Status ────────────────────────────────────────────────────────────
app.patch('/api/students/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Active', 'On Leave', 'Suspended', 'Graduated'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    db.prepare('UPDATE students SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
    const updated = db.prepare('SELECT * FROM students WHERE id = ?').get(id);

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error patching status:', err);
    res.status(500).json({ error: 'Failed to update student status' });
  }
});

// ─── Delete Student ──────────────────────────────────────────────────────────
app.delete('/api/students/:id', (req, res) => {
  try {
    const { id } = req.params;
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    db.prepare('DELETE FROM students WHERE id = ?').run(id);
    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (err) {
    console.error('Error deleting student:', err);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// ─── Bulk Import ─────────────────────────────────────────────────────────────
app.post('/api/students/bulk', (req, res) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'Payload must include an array of students' });
    }

    const insert = db.prepare(`
      INSERT INTO students (
        student_id, first_name, last_name, email, phone,
        gender, dob, department, year_level, gpa, status
      ) VALUES (
        @student_id, @first_name, @last_name, @email, @phone,
        @gender, @dob, @department, @year_level, @gpa, @status
      )
    `);

    let imported = 0;
    const insertMany = db.transaction((list) => {
      for (const s of list) {
        let sid = s.student_id || generateStudentId();
        let gpa = parseFloat(s.gpa) || 0.0;
        insert.run({
          student_id: sid,
          first_name: s.first_name,
          last_name: s.last_name,
          email: s.email,
          phone: s.phone || '',
          gender: s.gender || 'Other',
          dob: s.dob || '',
          department: s.department,
          year_level: s.year_level,
          gpa: gpa,
          status: s.status || 'Active',
        });
        imported++;
      }
    });

    insertMany(students);
    res.json({ success: true, message: `Successfully imported ${imported} students`, count: imported });
  } catch (err) {
    console.error('Error bulk importing students:', err);
    res.status(500).json({ error: 'Failed to bulk import: ' + err.message });
  }
});

// ─── Reset Database to Sample Data ───────────────────────────────────────────
app.post('/api/students/reset', (req, res) => {
  try {
    resetDatabase();
    res.json({ success: true, message: 'Database reset to sample data' });
  } catch (err) {
    console.error('Error resetting database:', err);
    res.status(500).json({ error: 'Failed to reset database' });
  }
});

// ─── Export CSV ──────────────────────────────────────────────────────────────
app.get('/api/export/csv', (req, res) => {
  try {
    const students = db.prepare('SELECT * FROM students ORDER BY id ASC').all();

    const escapeCSV = (str) => {
      if (str === null || str === undefined) return '';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const headers = [
      'ID', 'Student ID', 'First Name', 'Last Name', 'Email',
      'Phone', 'Gender', 'Date of Birth', 'Department', 'Year Level',
      'GPA', 'Status', 'Registered At',
    ];

    const rows = students.map(s => [
      s.id,
      escapeCSV(s.student_id),
      escapeCSV(s.first_name),
      escapeCSV(s.last_name),
      escapeCSV(s.email),
      escapeCSV(s.phone),
      escapeCSV(s.gender),
      escapeCSV(s.dob),
      escapeCSV(s.department),
      escapeCSV(s.year_level),
      s.gpa ? Number(s.gpa).toFixed(2) : '0.00',
      escapeCSV(s.status),
      escapeCSV(s.created_at),
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
    res.send(csvContent);
  } catch (err) {
    console.error('Error exporting CSV:', err);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// ─── Serve Frontend in Production ──────────────────────────────────────────
const clientDistPath = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(clientDistPath, 'index.html'));
    }
    next();
  });
}

// ─── Error Handling Middleware ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Student Management System Backend listening on http://localhost:${PORT}`);
});
