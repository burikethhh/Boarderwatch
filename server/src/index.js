require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initializeDatabase, getDatabase } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { startCronJobs, stopCronJobs } = require('./cron');
const { stopAllStreams } = require('./services/camera.service');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
initializeDatabase();

// Auto-seed if database is empty
const db = getDatabase();
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
if (userCount === 0) {
  console.log('[Init] Empty database detected, running seed...');
  try {
    require('./seed');
  } catch (err) {
    console.error('[Init] Seed failed:', err.message);
  }
}

// Middleware
app.use(cors({
  origin: (process.env.NODE_ENV || '').trim() === 'production' ? process.env.CLIENT_URL : 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve HLS stream segments
app.use('/streams', express.static(path.join(__dirname, '../streams')));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/tenants', require('./routes/tenant.routes'));
app.use('/api/rooms', require('./routes/room.routes'));
app.use('/api/leases', require('./routes/lease.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/cameras', require('./routes/cctv.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/reports', require('./routes/report.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/settings', require('./routes/settings.routes'));

// Health check
app.get('/api/health', (req, res) => {
  const db = getDatabase();
  const users = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const tenants = db.prepare("SELECT COUNT(*) as count FROM tenants WHERE status = 'active'").get().count;
  const rooms = db.prepare('SELECT COUNT(*) as count FROM rooms').get().count;
  const cameras = db.prepare('SELECT COUNT(*) as count FROM cctv_cameras').get().count;

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: (process.env.NODE_ENV || 'development').trim(),
    database: { users, tenants, rooms, cameras },
  });
});

// Stream proxy endpoint for camera HLS
app.get('/api/stream/:cameraId', (req, res) => {
  const cameraId = parseInt(req.params.cameraId);
  const streamPath = path.join(__dirname, `../streams/cam_${cameraId}/stream.m3u8`);

  const fs = require('fs');
  if (fs.existsSync(streamPath)) {
    res.sendFile(streamPath);
  } else {
    res.status(404).json({ error: 'Stream not available' });
  }
});

// Serve static frontend in production
if ((process.env.NODE_ENV || '').trim() === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  // Express 5 uses {0+} instead of * for catch-all
  app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

// Error handler
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`BoardersWatch server running on port ${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);

  // Start cron jobs
  startCronJobs();
});

// Graceful shutdown
function shutdown() {
  console.log('\n[Server] Shutting down...');
  stopCronJobs();
  stopAllStreams();
  server.close(() => {
    console.log('[Server] Goodbye');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = app;
