const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const { getDb } = require('../database/db');
const { parseFileBuffer, validateAndNormalizeRows, generateSampleData } = require('../services/excelParser');

// Memory storage for fast buffer processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// POST /api/upload/parse - Parse uploaded file and return column mapping + validation preview
router.post('/parse', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No spreadsheet file uploaded.' });
    }

    const { headers, detectedMapping, rawRows } = parseFileBuffer(req.file.buffer);

    // Initial validation using detected mapping
    const validationResult = validateAndNormalizeRows(rawRows, detectedMapping);

    res.json({
      success: true,
      filename: req.file.originalname,
      headers,
      detectedMapping,
      totalRows: validationResult.totalRows,
      validCount: validationResult.validCount,
      invalidCount: validationResult.invalidCount,
      previewRows: validationResult.rows.slice(0, 100), // First 100 for interactive preview
      allRows: rawRows // Returned for client-side mapping adjustment if needed
    });
  } catch (error) {
    console.error('Upload parse error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/upload/revalidate - Re-validate rows with updated user column mapping
router.post('/revalidate', (req, res) => {
  try {
    const { rawRows, mapping } = req.body;
    if (!rawRows || !mapping) {
      return res.status(400).json({ success: false, message: 'rawRows and mapping are required' });
    }

    const validationResult = validateAndNormalizeRows(rawRows, mapping);

    res.json({
      success: true,
      totalRows: validationResult.totalRows,
      validCount: validationResult.validCount,
      invalidCount: validationResult.invalidCount,
      previewRows: validationResult.rows.slice(0, 100)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/upload/commit - Commit validated rows to the database
router.post('/commit', (req, res) => {
  try {
    const db = getDb();
    const { rawRows, mapping, duplicateStrategy = 'skip', filename = 'Spreadsheet Upload', importBatchId } = req.body;

    if (!rawRows || !mapping) {
      return res.status(400).json({ success: false, message: 'Data rows and column mapping are required.' });
    }

    const validationResult = validateAndNormalizeRows(rawRows, mapping);
    const validRows = validationResult.rows.filter(r => r.isValid);

    if (validRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid candidate rows found to import. Please ensure Name and Email columns are mapped properly.'
      });
    }

    const currentBatchId = importBatchId || `batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const currentImportSource = filename || 'Spreadsheet Upload';

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const findExisting = db.prepare('SELECT id, name, college, phone, branch, batch FROM students WHERE email = ?');
    const insertStmt = db.prepare(`
      INSERT INTO students (name, email, college, phone, branch, batch, status, import_batch_id, import_source, tags, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const updateStmt = db.prepare(`
      UPDATE students 
      SET name = ?, college = ?, phone = ?, branch = ?, batch = ?, import_batch_id = ?, import_source = ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    const commitTx = db.transaction(() => {
      for (const row of validRows) {
        const item = row.normalized;
        const existing = findExisting.get(item.email);

        if (existing) {
          if (duplicateStrategy === 'skip') {
            skippedCount++;
          } else if (duplicateStrategy === 'update' || duplicateStrategy === 'overwrite') {
            updateStmt.run(
              item.name || existing.name,
              item.college || existing.college,
              item.phone || existing.phone,
              item.branch || existing.branch,
              item.batch || existing.batch,
              currentBatchId,
              currentImportSource,
              existing.id
            );
            updatedCount++;
          }
        } else {
          insertStmt.run(
            item.name,
            item.email,
            item.college,
            item.phone,
            item.branch,
            item.batch,
            'Active',
            currentBatchId,
            currentImportSource,
            item.tags,
            `Bulk imported from ${currentImportSource}`
          );
          insertedCount++;
        }
      }
    });

    commitTx();

    res.json({
      success: true,
      message: `Bulk import completed successfully! Saved ${insertedCount + updatedCount} students to database. (Added: ${insertedCount} new, Updated: ${updatedCount}, Skipped: ${skippedCount})`,
      batchId: currentBatchId,
      importSource: currentImportSource,
      summary: {
        totalAttempted: validRows.length,
        totalSaved: insertedCount + updatedCount,
        inserted: insertedCount,
        updated: updatedCount,
        skipped: skippedCount,
        invalidDiscarded: validationResult.invalidCount
      }
    });
  } catch (error) {
    console.error('Commit error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/upload/sample-csv - Download ready-to-use CSV template
router.get('/sample-csv', (req, res) => {
  try {
    const data = generateSampleData();
    const worksheet = xlsx.utils.json_to_sheet(data);
    const csv = xlsx.utils.sheet_to_csv(worksheet);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="aparaitech_students_template.csv"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/upload/sample-excel - Download ready-to-use Excel (.xlsx) template
router.get('/sample-excel', (req, res) => {
  try {
    const data = generateSampleData();
    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Students_Template');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="aparaitech_students_template.xlsx"');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
