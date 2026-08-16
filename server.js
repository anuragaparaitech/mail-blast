const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDb } = require('./database/db');
const { seedDatabase } = require('./database/seed');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Database & ensure seed data is loaded
try {
  getDb();
  seedDatabase();
} catch (err) {
  console.error('Database initialization error:', err);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// Mount API Routes
app.use('/api/students', require('./routes/students'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/inbox', require('./routes/inbox'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'Aparaitech Student Email Blast Web Application',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Single Page Application Fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Aparaitech Student Email Blast Server Running!`);
    console.log(`🌐 Local URL: http://localhost:${PORT}`);
    console.log(`🏢 Recruitment Portal: Aparaitech Software (aparaitech.org)`);
    console.log(`====================================================`);
  });
}

module.exports = app;
