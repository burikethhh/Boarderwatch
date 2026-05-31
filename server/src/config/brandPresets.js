const BRAND_PRESETS = {
  tapo: {
    name: 'TP-Link Tapo',
    rtspFormat: 'rtsp://{user}:{pass}@{ip}:{port}/{stream}',
    defaultPort: 554,
    streams: { high: 'stream1', standard: 'stream2' },
    motionWebhook: true,
  },
  hikvision: {
    name: 'Hikvision',
    rtspFormat: 'rtsp://{user}:{pass}@{ip}:{port}/ISAPI/streaming/channels/101',
    defaultPort: 554,
    streams: { high: '101', standard: '102' },
    motionWebhook: true,
  },
  dahua: {
    name: 'Dahua',
    rtspFormat: 'rtsp://{user}:{pass}@{ip}:{port}/cam/realmonitor?channel=1&subtype=0',
    defaultPort: 554,
    streams: { high: '0', standard: '1' },
    motionWebhook: true,
  },
  generic: {
    name: 'Generic RTSP',
    rtspFormat: 'rtsp://{user}:{pass}@{ip}:{port}{streamPath}',
    defaultPort: 554,
    streams: { high: '/stream1', standard: '/stream2' },
    motionWebhook: false,
  },
};

function buildRtspUrl(camera) {
  const preset = BRAND_PRESETS[camera.brand] || BRAND_PRESETS.generic;
  return preset.rtspFormat
    .replace('{user}', camera.username || '')
    .replace('{pass}', camera.password_encrypted || '')
    .replace('{ip}', camera.ip_address)
    .replace('{port}', camera.port || 554)
    .replace('{stream}', camera.stream_path || 'stream1')
    .replace('{streamPath}', camera.stream_path || '/stream1');
}

module.exports = { BRAND_PRESETS, buildRtspUrl };