/**
 * BoardersWatch Persistent Tunnel Daemon
 * Auto-maintains the public TCP tunnel to the Tapo C200 camera and syncs Render with fresh endpoints.
 */
const { spawn } = require('child_process');
const dns = require('dns').promises;

const RENDER_API = 'https://boarderswatch.onrender.com/api';
const LOCAL_CAMERA_IP = '192.168.254.123';
const LOCAL_CAMERA_PORT = 554;

async function syncRenderCamera(tunnelHost, tunnelPort) {
  try {
    console.log(`[Tunnel] Logging into Render to update camera endpoint...`);
    const loginRes = await fetch(`${RENDER_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    const loginData = await loginRes.json();
    if (!loginData.token) {
      console.error('[Tunnel] Render login failed:', loginData);
      return;
    }

    const token = loginData.token;
    console.log(`[Tunnel] Updating Camera 1 on Render to ${tunnelHost}:${tunnelPort}...`);
    
    // Check if camera exists first
    const checkRes = await fetch(`${RENDER_API}/cameras`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const cams = await checkRes.json();
    
    const camData = {
      camera_name: 'Main Entrance - Tapo C200',
      location: 'Front Gate / Main Entrance',
      brand: 'tapo',
      ip_address: tunnelHost,
      port: parseInt(tunnelPort),
      username: 'admin123',
      password: 'admin1234',
      stream_path: 'stream1',
      motion_detection: 1,
      alert_threshold: 'medium',
      status: 'active',
    };

    if (Array.isArray(cams) && cams.length > 0) {
      const targetId = cams[0].camera_id;
      const putRes = await fetch(`${RENDER_API}/cameras/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(camData),
      });
      console.log(`[Tunnel] Render Camera ${targetId} update status:`, putRes.status);
    } else {
      const postRes = await fetch(`${RENDER_API}/cameras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(camData),
      });
      console.log('[Tunnel] Render Camera created status:', postRes.status);
    }
    console.log(`[Tunnel] Successfully synced tunnel endpoint to Render!`);
  } catch (err) {
    console.error('[Tunnel] Failed to sync with Render:', err.message);
  }
}

function startTunnel() {
  console.log(`\n======================================================`);
  console.log(`[Tunnel] Launching Pinggy TCP tunnel for ${LOCAL_CAMERA_IP}:${LOCAL_CAMERA_PORT}...`);
  console.log(`======================================================`);

  const ssh = spawn('ssh', [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ServerAliveInterval=30',
    '-o', 'ServerAliveCountMax=3',
    '-p', '443',
    `-R0:${LOCAL_CAMERA_IP}:${LOCAL_CAMERA_PORT}`,
    'tcp@a.pinggy.io',
  ]);

  let updated = false;

  const handleOutput = (chunk) => {
    const text = chunk.toString();
    // Look for: tcp://([a-zA-Z0-9.-]+):(\d+)
    const match = text.match(/tcp:\/\/([a-zA-Z0-9.-]+):(\d+)/);
    if (match && !updated) {
      updated = true;
      const host = match[1];
      const port = match[2];
      console.log(`\n[Tunnel] ACTIVE TCP ENDPOINT: tcp://${host}:${port}`);
      syncRenderCamera(host, port);
    }
  };

  ssh.stdout.on('data', handleOutput);
  ssh.stderr.on('data', handleOutput);

  ssh.on('close', (code) => {
    console.log(`[Tunnel] SSH session closed with code ${code}. Reconnecting in 3 seconds...`);
    setTimeout(startTunnel, 3000);
  });

  ssh.on('error', (err) => {
    console.error(`[Tunnel] SSH process error:`, err.message);
  });
}

startTunnel();
