const dgram = require('dgram');
const net = require('net');
const os = require('os');

/**
 * Get active IPv4 local network subnets
 */
function getLocalSubnets() {
  const interfaces = os.networkInterfaces();
  const subnets = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const parts = iface.address.split('.');
        const baseIp = `${parts[0]}.${parts[1]}.${parts[2]}`;
        subnets.push({
          interfaceName: name,
          ip: iface.address,
          netmask: iface.netmask,
          baseIp,
        });
      }
    }
  }

  // Fallback if no non-internal found
  if (subnets.length === 0) {
    subnets.push({
      interfaceName: 'default',
      ip: '192.168.1.100',
      netmask: '255.255.255.0',
      baseIp: '192.168.1',
    });
  }

  return subnets;
}

/**
 * Fast TCP check if a single port is open on an IP
 */
function checkPort(ip, port, timeoutMs = 280) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isSettled = false;

    socket.setTimeout(timeoutMs);
    socket.on('connect', () => {
      if (!isSettled) {
        isSettled = true;
        socket.destroy();
        resolve(true);
      }
    });
    socket.on('timeout', () => {
      if (!isSettled) {
        isSettled = true;
        socket.destroy();
        resolve(false);
      }
    });
    socket.on('error', () => {
      if (!isSettled) {
        isSettled = true;
        socket.destroy();
        resolve(false);
      }
    });

    try {
      socket.connect(port, ip);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Perform ONVIF WS-Discovery probe via UDP multicast & broadcast
 */
function probeOnvif(timeoutMs = 2200) {
  return new Promise((resolve) => {
    const discovered = [];
    let socket;
    try {
      socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    } catch (e) {
      console.warn('[Discovery] UDP socket create error:', e.message);
      return resolve([]);
    }

    const probeXml = 
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope" ' +
      'xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing" ' +
      'xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery" ' +
      'xmlns:dn="http://www.onvif.org/ver10/network/wsdl">' +
      '<e:Header>' +
      '<w:MessageID>uuid:' + (Math.random().toString(36).substring(2, 15)) + '</w:MessageID>' +
      '<w:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To>' +
      '<w:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action>' +
      '</e:Header>' +
      '<e:Body>' +
      '<d:Probe>' +
      '<d:Types>dn:NetworkVideoTransmitter</d:Types>' +
      '</d:Probe>' +
      '</e:Body>' +
      '</e:Envelope>';

    socket.on('message', (msg, rinfo) => {
      const text = msg.toString();
      const ip = rinfo.address;

      if (!discovered.some(d => d.ip === ip)) {
        let isTapo = text.toLowerCase().includes('tapo') || text.toLowerCase().includes('tp-link');
        let model = 'ONVIF Camera';
        if (text.toLowerCase().includes('c200')) {
          model = 'TP-Link Tapo C200';
          isTapo = true;
        } else if (text.toLowerCase().includes('c100')) {
          model = 'TP-Link Tapo C100';
          isTapo = true;
        } else if (isTapo) {
          model = 'TP-Link Tapo Camera';
        }

        discovered.push({
          ip,
          name: model,
          brand: isTapo ? 'tapo_c200' : 'onvif',
          port: 554,
          onvifPort: rinfo.port,
          streamPath: '/stream1',
          protocol: 'ONVIF / RTSP',
          details: `Discovered via ONVIF probe on port ${rinfo.port}`
        });
      }
    });

    socket.on('error', () => {});

    socket.bind(0, () => {
      try {
        socket.setBroadcast(true);
        socket.setMulticastTTL(2);
        const buf = Buffer.from(probeXml);
        socket.send(buf, 0, buf.length, 3702, '239.255.255.250', () => {});
        socket.send(buf, 0, buf.length, 3702, '255.255.255.255', () => {});
      } catch {}
    });

    setTimeout(() => {
      try { socket.close(); } catch {}
      resolve(discovered);
    }, timeoutMs);
  });
}

/**
 * Scan a single subnet (baseIp = '192.168.1') for RTSP and Tapo ports
 */
async function scanSubnet(baseIp, myIp = '') {
  const discovered = [];
  const candidateIps = [];

  for (let i = 1; i <= 254; i++) {
    const ip = `${baseIp}.${i}`;
    if (ip !== myIp) {
      candidateIps.push(ip);
    }
  }

  // Scan concurrently in batches of 40 for optimal speed and router stability
  const batchSize = 40;
  for (let i = 0; i < candidateIps.length; i += batchSize) {
    const batch = candidateIps.slice(i, i + batchSize);
    await Promise.all(batch.map(async (ip) => {
      // Check 554 (standard RTSP) and 2020 (TP-Link Tapo ONVIF control)
      const [rtspOpen, tapoOpen] = await Promise.all([
        checkPort(ip, 554, 250),
        checkPort(ip, 2020, 250),
      ]);

      if (rtspOpen || tapoOpen) {
        const isTapo = tapoOpen || (rtspOpen && !tapoOpen);
        discovered.push({
          ip,
          name: tapoOpen ? 'TP-Link Tapo C200 (Detected)' : 'RTSP Security Camera',
          brand: tapoOpen ? 'tapo_c200' : 'generic_rtsp',
          port: 554,
          onvifPort: tapoOpen ? 2020 : null,
          streamPath: '/stream1',
          protocol: 'RTSP (H.264)',
          details: `Active Ports: ${[rtspOpen ? '554 (RTSP)' : null, tapoOpen ? '2020 (Tapo ONVIF)' : null].filter(Boolean).join(', ')}`
        });
      }
    }));
  }

  return discovered;
}

/**
 * Check a single specific IP directly
 */
async function probeSingleIp(ip) {
  const [rtspOpen, tapoOpen, httpOpen] = await Promise.all([
    checkPort(ip, 554, 800),
    checkPort(ip, 2020, 800),
    checkPort(ip, 80, 800),
  ]);

  if (rtspOpen || tapoOpen || httpOpen) {
    return {
      ip,
      reachable: true,
      name: tapoOpen ? 'TP-Link Tapo C200' : 'RTSP Security Camera',
      brand: tapoOpen ? 'tapo_c200' : 'generic_rtsp',
      port: rtspOpen ? 554 : (tapoOpen ? 2020 : 80),
      streamPath: '/stream1',
      openPorts: {
        rtsp: rtspOpen,
        tapoOnvif: tapoOpen,
        http: httpOpen,
      },
    };
  }

  return { ip, reachable: false, error: 'No camera response on ports 554, 2020, or 80' };
}

/**
 * Main auto-discovery entrypoint
 */
async function discoverCameras(options = {}) {
  const customSubnet = options.subnet; // e.g. "192.168.1"
  let subnets = getLocalSubnets();

  if (customSubnet) {
    const cleaned = customSubnet.replace(/\.0\/\d+$/, '').replace(/\.$/, '');
    subnets = [{
      interfaceName: 'custom',
      ip: '',
      netmask: '255.255.255.0',
      baseIp: cleaned,
    }];
  }

  const results = [];
  const seenIps = new Set();

  // Run ONVIF multicast discovery
  const onvifPromise = probeOnvif(2000);

  // Run Subnet TCP port scan
  const subnetScans = subnets.map(s => scanSubnet(s.baseIp, s.ip));

  const [onvifResults, ...subnetResults] = await Promise.all([
    onvifPromise,
    ...subnetScans,
  ]);

  // Merge ONVIF discoveries
  for (const item of onvifResults) {
    if (!seenIps.has(item.ip)) {
      seenIps.add(item.ip);
      results.push(item);
    }
  }

  // Merge Subnet scan discoveries
  for (const batch of subnetResults) {
    for (const item of batch) {
      if (!seenIps.has(item.ip)) {
        seenIps.add(item.ip);
        results.push(item);
      } else {
        const existing = results.find(r => r.ip === item.ip);
        if (existing && item.onvifPort) {
          existing.onvifPort = item.onvifPort;
          if (item.name.includes('Tapo')) {
            existing.name = item.name;
            existing.brand = 'tapo_c200';
          }
        }
      }
    }
  }

  return {
    scannedSubnets: subnets.map(s => `${s.baseIp}.0/24 (${s.interfaceName})`),
    cameras: results,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  getLocalSubnets,
  discoverCameras,
  probeSingleIp,
  checkPort,
};
