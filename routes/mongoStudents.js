const express = require('express');
const { ObjectId } = require('mongodb');
const xlsx = require('xlsx');
const { getPersistentMongoDb } = require('../database/mongo');

const router = express.Router();

function serialize(student) {
  if (!student) return student;
  const { _id, ...rest } = student;
  return { id: String(_id), ...rest };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function idFilter(id) {
  if (!ObjectId.isValid(id)) return null;
  return { _id: new ObjectId(id) };
}

function studentFilter(query) {
  const filter = {};
  const { search = '', college = '', batch = '', branch = '', status = '', import_batch_id = '' } = query;
  if (search.trim()) {
    const regex = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ name: regex }, { email: regex }, { college: regex }, { phone: regex }];
  }
  for (const [key, value] of Object.entries({ college, batch, branch, status, import_batch_id })) {
    if (value.trim()) filter[key] = value.trim();
  }
  return filter;
}

router.get('/', async (req, res) => {
  try {
    const db = await getPersistentMongoDb();
    const filter = studentFilter(req.query);
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const allowed = ['name', 'email', 'college', 'branch', 'batch', 'status', 'created_at', 'updated_at'];
    const sortBy = allowed.includes(req.query.sortBy) ? req.query.sortBy : 'created_at';
    const sortOrder = String(req.query.sortOrder).toUpperCase() === 'ASC' ? 1 : -1;
    const students = await db.collection('students').find(filter).sort({ [sortBy]: sortOrder, _id: -1 }).skip((page - 1) * limit).limit(limit).toArray();
    const [total, colleges, batches, branches, uploadBatches] = await Promise.all([
      db.collection('students').countDocuments(filter),
      db.collection('students').aggregate([{ $group: { _id: '$college', count: { $sum: 1 } } }, { $project: { _id: 0, college: '$_id', count: 1 } }, { $sort: { count: -1 } }]).toArray(),
      db.collection('students').distinct('batch', { batch: { $nin: [null, ''] } }),
      db.collection('students').distinct('branch', { branch: { $nin: [null, ''] } }),
      db.collection('students').aggregate([{ $match: { import_batch_id: { $nin: [null, ''] } } }, { $group: { _id: '$import_batch_id', import_source: { $first: '$import_source' }, student_count: { $sum: 1 }, created_at: { $min: '$created_at' } } }, { $project: { _id: 0, import_batch_id: '$_id', import_source: { $ifNull: ['$import_source', 'Uploaded Spreadsheet'] }, student_count: 1, created_at: 1 } }, { $sort: { created_at: -1 } }]).toArray()
    ]);
    res.json({ success: true, students: students.map(serialize), pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 }, filterOptions: { colleges, batches: batches.sort().reverse(), branches: branches.sort(), uploadBatches } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/batches', async (_req, res) => {
  try {
    const db = await getPersistentMongoDb();
    const batches = await db.collection('students').aggregate([{ $match: { import_batch_id: { $nin: [null, ''] } } }, { $group: { _id: '$import_batch_id', import_source: { $first: '$import_source' }, student_count: { $sum: 1 }, created_at: { $min: '$created_at' } } }, { $project: { _id: 0, import_batch_id: '$_id', import_source: { $ifNull: ['$import_source', 'Uploaded Spreadsheet'] }, student_count: 1, created_at: 1 } }, { $sort: { created_at: -1 } }]).toArray();
    res.json({ success: true, batches });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/colleges', async (_req, res) => {
  try {
    const db = await getPersistentMongoDb();
    const colleges = await db.collection('students').aggregate([{ $group: { _id: '$college', student_count: { $sum: 1 } } }, { $project: { _id: 0, college: '$_id', student_count: 1 } }, { $sort: { student_count: -1 } }]).toArray();
    res.json({ success: true, colleges });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/export', async (req, res) => {
  try {
    const db = await getPersistentMongoDb();
    const filter = studentFilter(req.query);
    if (req.query.ids) {
      const ids = req.query.ids.split(',').filter(ObjectId.isValid).map(id => new ObjectId(id));
      if (ids.length) filter._id = { $in: ids };
    }
    const students = (await db.collection('students').find(filter).toArray()).map(serialize);
    const full = req.query.fields !== 'name_email';
    const rows = students.map(s => full ? ({ 'Student Name': s.name, 'Email Address': s.email, 'College / University': s.college, 'Phone Number': s.phone || '', 'Branch / Degree': s.branch, 'Graduation Year': s.batch, Status: s.status, 'Registered Date': s.created_at }) : ({ Name: s.name, Email: s.email }));
    const sheet = xlsx.utils.json_to_sheet(rows); const book = xlsx.utils.book_new(); xlsx.utils.book_append_sheet(book, sheet, 'Students');
    const prefix = full ? 'aparaitech_students_full' : 'aparaitech_students_name_email';
    if (req.query.format === 'xlsx') { res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.setHeader('Content-Disposition', `attachment; filename="${prefix}.xlsx"`); return res.send(xlsx.write(book, { type: 'buffer', bookType: 'xlsx' })); }
    res.setHeader('Content-Type', 'text/csv'); res.setHeader('Content-Disposition', `attachment; filename="${prefix}.csv"`); res.send(xlsx.utils.sheet_to_csv(sheet));
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/:id', async (req, res) => {
  try { const filter = idFilter(req.params.id); if (!filter) return res.status(404).json({ success: false, message: 'Student not found' }); const student = await (await getPersistentMongoDb()).collection('students').findOne(filter); if (!student) return res.status(404).json({ success: false, message: 'Student not found' }); res.json({ success: true, student: serialize(student) }); } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, email, college, phone, branch, batch, tags, notes } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, message: 'Name and Email are required fields.' });
    const cleanEmail = email.trim().toLowerCase(); const db = await getPersistentMongoDb();
    if (await db.collection('students').findOne({ email: cleanEmail })) return res.status(409).json({ success: false, message: `A student with email "${cleanEmail}" already exists.` });
    const now = new Date().toISOString(); const student = { name: name.trim(), email: cleanEmail, college: (college || 'General Pool').trim(), phone: (phone || '').trim(), branch: (branch || 'Computer Science').trim(), batch: (batch || '2026').trim(), status: 'Active', import_batch_id: null, import_source: 'Manual Entry', tags: Array.isArray(tags) ? tags : (tags || '[]'), notes: (notes || '').trim(), created_at: now, updated_at: now };
    const result = await db.collection('students').insertOne(student); res.status(201).json({ success: true, student: serialize({ ...student, _id: result.insertedId }), message: 'Student added successfully' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const filter = idFilter(req.params.id); if (!filter) return res.status(404).json({ success: false, message: 'Student not found' }); const db = await getPersistentMongoDb(); const existing = await db.collection('students').findOne(filter); if (!existing) return res.status(404).json({ success: false, message: 'Student not found' });
    const cleanEmail = req.body.email ? req.body.email.trim().toLowerCase() : existing.email;
    if (cleanEmail !== existing.email && await db.collection('students').findOne({ email: cleanEmail, _id: { $ne: existing._id } })) return res.status(409).json({ success: false, message: `Email "${cleanEmail}" is already used by another student.` });
    const update = { name: req.body.name ? req.body.name.trim() : existing.name, email: cleanEmail, college: req.body.college ? req.body.college.trim() : existing.college, phone: req.body.phone !== undefined ? req.body.phone.trim() : existing.phone, branch: req.body.branch ? req.body.branch.trim() : existing.branch, batch: req.body.batch ? req.body.batch.trim() : existing.batch, status: req.body.status || existing.status, tags: Array.isArray(req.body.tags) ? req.body.tags : (req.body.tags || existing.tags), notes: req.body.notes !== undefined ? req.body.notes.trim() : existing.notes, updated_at: new Date().toISOString() };
    await db.collection('students').updateOne(filter, { $set: update }); res.json({ success: true, student: serialize({ ...existing, ...update }), message: 'Student updated successfully' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.delete('/batch/:batchId', async (req, res) => { try { const result = await (await getPersistentMongoDb()).collection('students').deleteMany({ import_batch_id: req.params.batchId }); res.json({ success: true, deletedCount: result.deletedCount, message: `Successfully deleted all ${result.deletedCount} candidates from this bulk upload.` }); } catch (error) { res.status(500).json({ success: false, message: error.message }); } });
router.post('/bulk-delete', async (req, res) => { try { const ids = Array.isArray(req.body.ids) ? req.body.ids.filter(ObjectId.isValid).map(id => new ObjectId(id)) : []; if (!ids.length) return res.status(400).json({ success: false, message: 'An array of student IDs is required.' }); const result = await (await getPersistentMongoDb()).collection('students').deleteMany({ _id: { $in: ids } }); res.json({ success: true, deletedCount: result.deletedCount, message: `Successfully deleted ${result.deletedCount} students.` }); } catch (error) { res.status(500).json({ success: false, message: error.message }); } });
router.delete('/:id', async (req, res) => { try { const filter = idFilter(req.params.id); if (!filter) return res.status(404).json({ success: false, message: 'Student not found' }); const result = await (await getPersistentMongoDb()).collection('students').deleteOne(filter); if (!result.deletedCount) return res.status(404).json({ success: false, message: 'Student not found' }); res.json({ success: true, message: 'Student deleted successfully' }); } catch (error) { res.status(500).json({ success: false, message: error.message }); } });

module.exports = router;
