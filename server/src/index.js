console.log('[BoardersWatch] Starting server...');
console.log('[BoardersWatch] NODE_ENV:', process.env.NODE_ENV);
console.log('[BoardersWatch] PORT:', process.env.PORT);

try {
  require('dotenv').config();
  console.log('[BoardersWatch] dotenv loaded');
} catch (e) {
  console.error('[BoardersWatch] dotenv error:', e.message);
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

console.log('[BoardersWatch] Express loaded');

let db;
try {
  const database = require('./config/database');
  database.initializeDatabase();
  db = database.getDatabase();
  console.log('[BoardersWatch] Database initialized');
} catch (e) {
  console.error('[BoardersWatch] Database error:', e.message);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Auto-seed if database is empty
try {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    console.log('[BoardersWatch] Empty database, running seed...');
    require('./seed');
    console.log('[BoardersWatch] Seed complete');
  }
} catch (e) {
  console.error('[BoardersWatch] Seed error:', e.message);
}



// Middleware
app.use(cors({
  origin: (process.env.NODE_ENV || '').trim() === 'production'
    ? (process.env.CLIENT_URL ? [process.env.CLIENT_URL] : true)
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve HLS stream segments
app.use('/streams', express.static(path.join(__dirname, '../streams')));

// Serve recorded evidence clips
app.use('/api/recordings', express.static(path.join(__dirname, '../recordings')));

// Routes
try {
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
  console.log('[BoardersWatch] Routes loaded');
} catch (e) {
  console.error('[BoardersWatch] Route error:', e.message);
}

// Health check
app.get('/api/health', (req, res) => {
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

app.get('/api/health/ffmpeg', (req, res) => {
  const { execSync } = require('child_process');
  let staticPath = null;
  try { staticPath = require('ffmpeg-static'); } catch (e) { staticPath = e.message; }
  let version = null;
  try { version = execSync(`"${staticPath || 'ffmpeg'}" -version`).toString().slice(0, 150); } catch (e) { version = e.message; }
  res.json({ staticPath, version });
});

app.get('/api/health/ffmpeg-test', (req, res) => {
  const { spawnSync } = require('child_process');
  const staticPath = require('ffmpeg-static') || 'ffmpeg';
  const url = req.query.rtsp || 'rtsp://admin123:admin1234@mnydp-2001-fd8-bc8b-1e00-6004-dad3-d9b2-bf0a.run.pinggy-free.link:38605/stream1';
  try {
    const result = spawnSync(staticPath, [
      '-timeout', '10000000',
      '-rtsp_transport', 'tcp',
      '-i', url,
      '-t', '1',
      '-f', 'null',
      '-'
    ], { timeout: 15000 });
    res.json({
      status: result.status,
      signal: result.signal,
      error: result.error ? result.error.message : null,
      stderr: result.stderr ? result.stderr.toString().slice(-1000) : null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Stream proxy endpoint for camera HLS (serves playlist and .ts chunks)
app.use('/api/stream/:cameraId', (req, res) => {
  const cameraId = parseInt(req.params.cameraId);
  if (isNaN(cameraId)) {
    return res.status(400).json({ error: 'Invalid camera ID' });
  }

  const streamDir = path.join(__dirname, `../streams/cam_${cameraId}`);
  const reqSubPath = req.url.split('?')[0].replace(/^\//, '');
  const targetFile = reqSubPath === '' ? 'stream.m3u8' : reqSubPath;
  const filePath = path.join(streamDir, targetFile);

  if (fs.existsSync(filePath)) {
    if (targetFile.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (targetFile.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
      res.setHeader('Cache-Control', 'no-cache');
    }
    return res.sendFile(filePath);
  }

  res.status(404).json({ error: 'Stream segment or playlist not available' });
});

// Serve static frontend in production
if ((process.env.NODE_ENV || '').trim() === 'production') {
  console.log('[BoardersWatch] Serving static frontend');
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

// Error handler
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`[BoardersWatch] Server running on port ${PORT}`);
  console.log(`[BoardersWatch] API: http://localhost:${PORT}/api`);

  // Start cron jobs
  try {
    const { startCronJobs } = require('./cron');
    startCronJobs();
    console.log('[BoardersWatch] Cron jobs started');
  } catch (e) {
    console.error('[BoardersWatch] Cron error:', e.message);
  }

  // Start server-side motion detection
  try {
    const security = require('./services/security.service');
    security.startAll();
  } catch (e) {
    console.error('[BoardersWatch] Motion service error:', e.message);
  }
});

// Graceful shutdown
function shutdown() {
  console.log('\n[BoardersWatch] Shutting down...');
  try {
    const { stopCronJobs } = require('./cron');
    stopCronJobs();
  } catch {}
  try {
    const { stopAllStreams } = require('./services/camera.service');
    stopAllStreams();
  } catch {}
  try {
    const security = require('./services/security.service');
    security.stopAll();
  } catch {}
  server.close(() => {
    console.log('[BoardersWatch] Goodbye');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = app;
