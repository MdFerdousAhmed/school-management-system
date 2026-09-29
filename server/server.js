require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const {
  connectDB,
  getDB,
  getStudentsCollection,
  formatStudent,
  resetDatabase,
  ObjectId,
} = require('./db');

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

// Helper: Build query to find student by either ObjectId or student_id
function buildIdQuery(id) {
  if (ObjectId.isValid(id) && String(new ObjectId(id)) === String(id)) {
    return { $or: [{ _id: new ObjectId(id) }, { student_id: id }] };
  }
  return { student_id: id };
}

// Helper: Auto-generate student ID
async function generateStudentId() {
  const col = getStudentsCollection();
  const year = new Date().getFullYear();
  const prefix = `STU-${year}-`;

  const latest = await col
    .find({ student_id: new RegExp(`^${prefix}`) })
    .sort({ student_id: -1 })
    .limit(1)
    .toArray();

  let nextNum = 1;
  if (latest && latest.length > 0 && latest[0].student_id) {
    const parts = latest[0].student_id.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  } else {
    const totalCount = await col.countDocuments();
    nextNum = totalCount + 1;
  }

  // Ensure uniqueness
  while (true) {
    const candidate = `${prefix}${String(nextNum).padStart(4, '0')}`;
    const exists = await col.findOne({ student_id: candidate });
    if (!exists) return candidate;
    nextNum++;
  }
}

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const db = getDB();
    await db.command({ ping: 1 });
    res.json({ status: 'ok', database: 'connected', uptime: process.uptime() });
  } catch (err) {
    res.status(503).json({ status: 'degraded', database: 'disconnected', error: err.message });
  }
});

// ─── Stats ────────────────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const col = getStudentsCollection();

    const total = await col.countDocuments();
    const active = await col.countDocuments({ status: 'Active' });

    const avgResult = await col.aggregate([
      { $match: { gpa: { $ne: null } } },
      { $group: { _id: null, avgGpa: { $avg: '$gpa' } } },
    ]).toArray();

    const avgGpa = avgResult.length > 0 && avgResult[0].avgGpa !== null
      ? Number(Number(avgResult[0].avgGpa).toFixed(2))
      : 0;

    const deptRows = await col.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $project: { _id: 0, department: '$_id', count: 1 } },
      { $sort: { count: -1 } },
    ]).toArray();

    const statusRows = await col.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).toArray();

    const ALL_STATUSES = ['Active', 'On Leave', 'Suspended', 'Graduated'];
    const statusMap = Object.fromEntries(statusRows.map(r => [r._id, r.count]));
    const statuses = ALL_STATUSES.map(s => ({
      status: s,
      count: statusMap[s] || 0,
    }));

    const yearRows = await col.aggregate([
      { $group: { _id: '$year_level', count: { $sum: 1 } } },
    ]).toArray();

    const ALL_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];
    const yearMap = Object.fromEntries(yearRows.map(r => [r._id, r.count]));
    const yearLevels = ALL_YEARS.map(y => ({
      year_level: y,
      count: yearMap[y] || 0,
    }));

    res.json({
      success: true,
      stats: {
        total,
        active,
        avgGpa,
        departments: deptRows,
        statuses,
        yearLevels,
      },
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to retrieve stats: ' + err.message });
  }
});

// ─── Students List (Search, Filter, Sort, Pagination) ────────────────────────
app.get('/api/students', async (req, res) => {
  try {
    const col = getStudentsCollection();
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

    const query = {};

    if (q && q.trim()) {
      const term = q.trim();
      const regex = new RegExp(term, 'i');
      query.$or = [
        { first_name: regex },
        { last_name: regex },
        { email: regex },
        { student_id: regex },
        { phone: regex },
      ];
    }

    if (department && department !== 'All') {
      query.department = department;
    }

    if (year_level && year_level !== 'All') {
      query.year_level = year_level;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Allowed sort fields
    const allowedSortFields = [
      'id', 'student_id', 'first_name', 'last_name',
      'email', 'department', 'year_level', 'gpa', 'status', 'created_at',
    ];
    const safeSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'id';
    const sortField = safeSortBy === 'id' ? '_id' : safeSortBy;
    const sortOrderNum = String(sort_order).toUpperCase() === 'ASC' ? 1 : -1;

    const total = await col.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(total / limitNum));

    const docs = await col
      .find(query)
      .sort({ [sortField]: sortOrderNum })
      .skip(skip)
      .limit(limitNum)
      .toArray();

    const data = docs.map(formatStudent);

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
    res.status(500).json({ error: 'Failed to retrieve students: ' + err.message });
  }
});

// ─── Single Student ──────────────────────────────────────────────────────────
app.get('/api/students/:id', async (req, res) => {
  try {
    const col = getStudentsCollection();
    const student = await col.findOne(buildIdQuery(req.params.id));
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const formatted = formatStudent(student);
    res.json({ success: true, data: formatted, ...formatted });
  } catch (err) {
    console.error('Error fetching student:', err);
    res.status(500).json({ error: 'Failed to retrieve student: ' + err.message });
  }
});

// ─── Create Student ──────────────────────────────────────────────────────────
app.post('/api/students', async (req, res) => {
  try {
    const col = getStudentsCollection();
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
    const existingEmail = await col.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ error: 'A student with this email address already exists.' });
    }

    // Auto-generate or validate student_id
    if (!student_id || !student_id.trim()) {
      student_id = await generateStudentId();
    } else {
      student_id = student_id.trim();
      const existingId = await col.findOne({ student_id });
      if (existingId) {
        return res.status(409).json({ error: 'A student with this Student ID already exists.' });
      }
    }

    // Parse GPA
    let numGpa = parseFloat(gpa);
    if (isNaN(numGpa) || numGpa < 0) numGpa = 0.0;
    if (numGpa > 4.0) numGpa = 4.0;
    numGpa = Number(numGpa.toFixed(2));

    const now = new Date().toISOString();
    const doc = {
      student_id,
      first_name,
      last_name,
      email,
      phone: phone ? phone.trim() : '',
      gender: gender || 'Other',
      dob: dob || '',
      department,
      year_level,
      gpa: numGpa,
      status: status || 'Active',
      created_at: now,
      updated_at: now,
    };

    const result = await col.insertOne(doc);
    const newStudent = formatStudent({ ...doc, _id: result.insertedId });
    res.status(201).json({ success: true, data: newStudent });
  } catch (err) {
    console.error('Error creating student:', err);
    res.status(500).json({ error: 'Failed to create student: ' + err.message });
  }
});

// ─── Update Student ──────────────────────────────────────────────────────────
app.put('/api/students/:id', async (req, res) => {
  try {
    const col = getStudentsCollection();
    const { id } = req.params;
    const existing = await col.findOne(buildIdQuery(id));
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
    const duplicateEmail = await col.findOne({ email, _id: { $ne: existing._id } });
    if (duplicateEmail) {
      return res.status(409).json({ error: 'Another student already has this email address.' });
    }

    student_id = student_id ? student_id.trim() : existing.student_id;
    const duplicateId = await col.findOne({ student_id, _id: { $ne: existing._id } });
    if (duplicateId) {
      return res.status(409).json({ error: 'Another student already has this Student ID.' });
    }

    let numGpa = parseFloat(gpa);
    if (isNaN(numGpa) || numGpa < 0) numGpa = 0.0;
    if (numGpa > 4.0) numGpa = 4.0;
    numGpa = Number(numGpa.toFixed(2));

    const updateFields = {
      student_id,
      first_name,
      last_name,
      email,
      phone: phone ? phone.trim() : '',
      gender: gender || 'Other',
      dob: dob || '',
      department,
      year_level,
      gpa: numGpa,
      status: status || 'Active',
      updated_at: new Date().toISOString(),
    };

    await col.updateOne({ _id: existing._id }, { $set: updateFields });
    const updated = await col.findOne({ _id: existing._id });
    res.json({ success: true, data: formatStudent(updated) });
  } catch (err) {
    console.error('Error updating student:', err);
    res.status(500).json({ error: 'Failed to update student: ' + err.message });
  }
});

// ─── Patch Status ────────────────────────────────────────────────────────────
app.patch('/api/students/:id/status', async (req, res) => {
  try {
    const col = getStudentsCollection();
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Active', 'On Leave', 'Suspended', 'Graduated'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const existing = await col.findOne(buildIdQuery(id));
    if (!existing) {
      return res.status(404).json({ error: 'Student not found' });
    }

    await col.updateOne(
      { _id: existing._id },
      { $set: { status, updated_at: new Date().toISOString() } }
    );
    const updated = await col.findOne({ _id: existing._id });
    res.json({ success: true, data: formatStudent(updated) });
  } catch (err) {
    console.error('Error patching status:', err);
    res.status(500).json({ error: 'Failed to update student status: ' + err.message });
  }
});

// ─── Delete Student ──────────────────────────────────────────────────────────
app.delete('/api/students/:id', async (req, res) => {
  try {
    const col = getStudentsCollection();
    const { id } = req.params;
    const existing = await col.findOne(buildIdQuery(id));
    if (!existing) {
      return res.status(404).json({ error: 'Student not found' });
    }

    await col.deleteOne({ _id: existing._id });
    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (err) {
    console.error('Error deleting student:', err);
    res.status(500).json({ error: 'Failed to delete student: ' + err.message });
  }
});

// ─── Bulk Import ─────────────────────────────────────────────────────────────
app.post('/api/students/bulk', async (req, res) => {
  try {
    const col = getStudentsCollection();
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'Payload must include an array of students' });
    }

    const now = new Date().toISOString();
    const docs = [];
    for (const s of students) {
      let sid = s.student_id || await generateStudentId();
      let gpa = parseFloat(s.gpa) || 0.0;
      docs.push({
        student_id: sid,
        first_name: s.first_name,
        last_name: s.last_name,
        email: s.email ? s.email.trim().toLowerCase() : '',
        phone: s.phone || '',
        gender: s.gender || 'Other',
        dob: s.dob || '',
        department: s.department,
        year_level: s.year_level,
        gpa: gpa,
        status: s.status || 'Active',
        created_at: now,
        updated_at: now,
      });
    }

    const result = await col.insertMany(docs, { ordered: false });
    res.json({
      success: true,
      message: `Successfully imported ${result.insertedCount} students`,
      count: result.insertedCount,
    });
  } catch (err) {
    console.error('Error bulk importing students:', err);
    res.status(500).json({ error: 'Failed to bulk import: ' + err.message });
  }
});

// ─── Reset Database to Sample Data ───────────────────────────────────────────
app.post('/api/students/reset', async (req, res) => {
  try {
    await resetDatabase();
    res.json({ success: true, message: 'Database reset to sample data' });
  } catch (err) {
    console.error('Error resetting database:', err);
    res.status(500).json({ error: 'Failed to reset database: ' + err.message });
  }
});

// ─── Export CSV ──────────────────────────────────────────────────────────────
app.get('/api/export/csv', async (req, res) => {
  try {
    const col = getStudentsCollection();
    const students = await col.find({}).sort({ created_at: 1 }).toArray();

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
      s._id.toString(),
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

// Start Server after connecting to MongoDB
async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Student Management System Backend listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    // Don't crash immediately in development if MongoDB isn't running locally yet; listen anyway so health check reports status
    app.listen(PORT, () => {
      console.log(`⚠️ Server running on http://localhost:${PORT} (Waiting for MongoDB connection...)`);
    });
  }
}

startServer();
