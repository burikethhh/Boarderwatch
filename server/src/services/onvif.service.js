/**
 * BoardersWatch ONVIF Control Service
 *
 * Controls the Tapo C200 through its standard ONVIF interface (port 2020):
 * pan/tilt, presets and (where supported) imaging/night-vision settings.
 * This is far more reliable than the vendor-proprietary protocol.
 */

const onvif = require('node-onvif');
const soapMod = require('node-onvif/lib/modules/soap.js');
const mUrl = require('url');

const devices = new Map();

async function getVideoSourceToken(dev) {
  if (dev.__vsToken) return dev.__vsToken;
  const vs = await dev.services.media.getVideoSources();
  const src = vs.data.GetVideoSourcesResponse.VideoSources;
  dev.__vsToken = src.$.token;
  return dev.__vsToken;
}

function imagingCall(camera, action, body) {
  return new Promise((resolve, reject) => {
    const xaddr = `http://${camera.ip_address}:2020/onvif/imaging_service`;
    const oxaddr = mUrl.parse(xaddr);
    oxaddr.auth = `${camera.username || ''}:${camera.password_encrypted || ''}`;
    const soap = soapMod.createRequestSoap({
      body,
      xmlns: ['xmlns:timg="http://www.onvif.org/ver20/imaging/wsdl"', 'xmlns:tt="http://www.onvif.org/ver10/schema"'],
      diff: 1000, user: camera.username || '', pass: camera.password_encrypted || '',
    });
    soapMod.requestCommand(oxaddr, action, soap).then(resolve).catch(reject);
  });
}

async function getDevice(camera) {
  let dev = devices.get(camera.camera_id);
  if (dev && dev.__ready) return dev;

  dev = new onvif.OnvifDevice({
    xaddr: `http://${camera.ip_address}:2020/onvif/device_service`,
    user: camera.username || '',
    pass: camera.password_encrypted || '',
  });
  await dev.init();
  dev.__ready = true;
  devices.set(camera.camera_id, dev);

  try {
    const profiles = await dev.getProfileList();
    if (profiles && profiles[0]) {
      dev.__profileToken = profiles[0].token;
      dev.changeProfile(profiles[0].token);
    }
  } catch (e) {
    dev.__profileToken = 'profile_1';
  }
  return dev;
}

function forget(cameraId) { devices.delete(Number(cameraId)); }

async function info(camera) {
  const dev = await getDevice(camera);
  return {
    information: dev.getInformation(),
    services: Object.keys(dev.services || {}),
    profile: dev.__profileToken,
  };
}

async function move(camera, x, y, duration = 500) {
  const dev = await getDevice(camera);
  const seconds = Math.max(1, Math.round(duration / 1000));
  await dev.ptzMove({ speed: { x: Number(x) || 0, y: Number(y) || 0, z: 0 }, timeout: seconds });
  setTimeout(() => { dev.ptzStop().catch(() => {}); }, duration);
  return { success: true };
}

async function stop(camera) {
  const dev = await getDevice(camera);
  await dev.ptzStop();
  return { success: true };
}

async function gotoHome(camera) {
  const dev = await getDevice(camera);
  await dev.services.ptz.gotoHomePosition({ ProfileToken: dev.__profileToken || 'profile_1' });
  return { success: true };
}

async function getPresets(camera) {
  const dev = await getDevice(camera);
  const res = await dev.services.ptz.getPresets({ ProfileToken: dev.__profileToken || 'profile_1' });
  const data = (res && res.data) || {};
  let presets = (data.GetPresetsResponse && data.GetPresetsResponse.Preset) || data.Preset || [];
  if (!Array.isArray(presets)) presets = [presets];
  return presets.map(p => ({
    token: (p && p.$ && p.$.token) || (p && p.token) || null,
    name: (p && p.Name) || (p && p.name) || 'Preset',
  })).filter(p => p.token);
}

async function savePreset(camera, name) {
  const dev = await getDevice(camera);
  const res = await dev.services.ptz.setPreset({ ProfileToken: dev.__profileToken || 'profile_1', PresetName: name || 'Preset' });
  const data = (res && res.data) || {};
  const token = (data.SetPresetResponse && data.SetPresetResponse.PresetToken) || null;
  return { success: true, token, name };
}

async function gotoPreset(camera, token) {
  const dev = await getDevice(camera);
  await dev.services.ptz.gotoPreset({ ProfileToken: dev.__profileToken || 'profile_1', PresetToken: String(token) });
  return { success: true, token };
}

// ---- imaging (night vision / picture settings) -----------------------------

async function getImaging(camera) {
  const dev = await getDevice(camera);
  const token = await getVideoSourceToken(dev);
  const res = await imagingCall(camera, 'GetImagingSettings',
    `<timg:GetImagingSettings><timg:VideoSourceToken>${token}</timg:VideoSourceToken></timg:GetImagingSettings>`);
  return res.data;
}

async function setIrCutFilter(camera, mode) {
  const dev = await getDevice(camera);
  const token = await getVideoSourceToken(dev);
  const val = mode === 'on' ? 'ON' : mode === 'off' ? 'OFF' : 'AUTO';
  await imagingCall(camera, 'SetImagingSettings',
    `<timg:SetImagingSettings><timg:VideoSourceToken>${token}</timg:VideoSourceToken>` +
    `<timg:ImagingSettings><tt:IrCutFilter>${val}</tt:IrCutFilter></timg:ImagingSettings>` +
    `<timg:ForcePersistence>true</timg:ForcePersistence></timg:SetImagingSettings>`);

  let supported = false;
  try {
    const g = await getImaging(camera);
    const settings = g.GetImagingSettingsResponse && g.GetImagingSettingsResponse.ImagingSettings;
    supported = !!(settings && 'IrCutFilter' in settings);
  } catch { supported = false; }

  return { mode, supported };
}

async function setPicture(camera, { brightness, contrast, saturation, sharpness }) {
  const dev = await getDevice(camera);
  const token = await getVideoSourceToken(dev);
  const parts = [];
  if (brightness != null) parts.push(`<tt:Brightness>${brightness}</tt:Brightness>`);
  if (contrast != null) parts.push(`<tt:Contrast>${contrast}</tt:Contrast>`);
  if (saturation != null) parts.push(`<tt:ColorSaturation>${saturation}</tt:ColorSaturation>`);
  if (sharpness != null) parts.push(`<tt:Sharpness>${sharpness}</tt:Sharpness>`);
  await imagingCall(camera, 'SetImagingSettings',
    `<timg:SetImagingSettings><timg:VideoSourceToken>${token}</timg:VideoSourceToken>` +
    `<timg:ImagingSettings>${parts.join('')}</timg:ImagingSettings>` +
    `<timg:ForcePersistence>true</timg:ForcePersistence></timg:SetImagingSettings>`);
  return { success: true };
}

// ---- software auto-follow (motion centroid -> ONVIF PTZ) -------------------

const lastFollow = new Map();
const DEADZONE = 0.18;
const INTERVAL = 1200;

async function follow(camera, cx, cy) {
  if (cx == null || cy == null) return { moved: false };
  const now = Date.now();
  if (now - (lastFollow.get(camera.camera_id) || 0) < INTERVAL) return { moved: false, throttled: true };
  lastFollow.set(camera.camera_id, now);

  const dx = cx - 0.5;
  const dy = cy - 0.5;
  if (Math.abs(dx) < DEADZONE && Math.abs(dy) < DEADZONE) return { moved: false, centered: true };

  const speed = 0.5;
  const x = Math.abs(dx) < DEADZONE ? 0 : (dx > 0 ? speed : -speed);
  const y = Math.abs(dy) < DEADZONE ? 0 : (dy > 0 ? -speed : speed); // invert vertical

  try {
    await move(camera, x, y, 450);
    return { moved: true, x, y };
  } catch (e) {
    return { moved: false, error: e.message };
  }
}

function resetFollow(cameraId) { lastFollow.delete(Number(cameraId)); }

module.exports = {
  getDevice, forget, info, move, stop, gotoHome,
  getPresets, savePreset, gotoPreset, follow, resetFollow,
  getImaging, setIrCutFilter, setPicture,
};
