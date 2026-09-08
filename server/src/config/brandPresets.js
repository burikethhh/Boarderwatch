const BRAND_PRESETS = {
  tapo: {
    name: 'TP-Link Tapo C200 / Series',
    rtspFormat: 'rtsp://{user}:{pass}@{ip}:{port}/{stream}',
    defaultPort: 554,
    streams: { high: 'stream1', standard: 'stream2' },
    description: 'Requires local Camera Account created in Tapo App (Settings > Advanced > Camera Account)',
    motionWebhook: true,
  },
  hikvision: {
    name: 'Hikvision',
    rtspFormat: 'rtsp://{user}:{pass}@{ip}:{port}/ISAPI/streaming/channels/101',
    defaultPort: 554,
    streams: { high: '101', standard: '102' },
    description: 'Channel 101 for main stream, 102 for sub stream',
    motionWebhook: true,
  },
  dahua: {
    name: 'Dahua',
    rtspFormat: 'rtsp://{user}:{pass}@{ip}:{port}/cam/realmonitor?channel=1&subtype=0',
    defaultPort: 554,
    streams: { high: '0', standard: '1' },
    description: 'Subtype 0 for main stream, 1 for sub stream',
    motionWebhook: true,
  },
  generic: {
    name: 'Generic RTSP',
    rtspFormat: 'rtsp://{user}:{pass}@{ip}:{port}{streamPath}',
    defaultPort: 554,
    streams: { high: '/stream1', standard: '/stream2' },
    description: 'Standard RTSP protocol over TCP/UDP',
    motionWebhook: false,
  },
};

function buildRtspUrl(camera) {
  const preset = BRAND_PRESETS[camera.brand] || BRAND_PRESETS.generic;
  const rawStream = camera.stream_path || (preset.streams ? preset.streams.high : 'stream1');
  const cleanStream = rawStream.replace(/^\/+/, '');
  const streamPath = '/' + cleanStream;

  return preset.rtspFormat
    .replace('{user}', encodeURIComponent(camera.username || '').replace(/%40/g, '@'))
    .replace('{pass}', encodeURIComponent(camera.password_encrypted || ''))
    .replace('{ip}', camera.ip_address || '127.0.0.1')
    .replace('{port}', camera.port || preset.defaultPort || 554)
    .replace('{stream}', cleanStream)
    .replace('{streamPath}', streamPath);
}

module.exports = { BRAND_PRESETS, buildRtspUrl };