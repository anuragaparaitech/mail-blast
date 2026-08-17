require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDb } = require('./database/db');
const { seedDatabase } = require('./database/seed');
const { getPersistentMongoDb } = require('./database/mongo');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Database & ensure seed data is loaded
try {
  getDb();
  seedDatabase();

  // If MongoDB URI is configured in environment, connect to MongoDB Atlas
  if (process.env.MONGODB_URI) {
    getPersistentMongoDb().catch(err => {
      console.warn('MongoDB Atlas auto-connect note:', err.message);
    });
  }
} catch (err) {
  console.error('Database initialization error:', err);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// Mount API Routes
// Vercel's filesystem is temporary. When Atlas is configured, route student
// reads and writes to it directly so records survive cold starts and deploys.
app.use('/api/students', process.env.MONGODB_URI
  ? require('./routes/mongoStudents')
  : require('./routes/students'));
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
  const os = require('os');
  const HOST = '0.0.0.0';

  app.listen(PORT, HOST, () => {
    // Find LAN IP
    const nets = os.networkInterfaces();
    const networkIps = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          networkIps.push({ name, address: net.address });
        }
      }
    }

    console.log(`====================================================`);
    console.log(`🚀 Aparaitech Student Email Blast Server Running!`);
    console.log(`💻 Local URL:   http://localhost:${PORT}`);
    networkIps.forEach(net => {
      console.log(`📱 Network URL (${net.name}): http://${net.address}:${PORT}`);
    });
    console.log(`🏢 Recruitment Portal: Aparaitech Software (aparaitech.org)`);
    console.log(`====================================================`);
  });
}

module.exports = app;
