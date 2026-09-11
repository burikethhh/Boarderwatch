const onvif = require('node-onvif');
const device = new onvif.OnvifDevice({
  xaddr: 'http://192.168.254.129:2020/onvif/device_service',
  user: 'admin123',
  pass: 'admin1234',
});
(async () => {
  await device.init();
  try {
    const profiles = await device.getProfileList();
    const prof = profiles[0];
    device.changeProfile(prof.token);
    console.log('PROFILE token:', prof.token, '| name:', prof.name);
  } catch (e) { console.log('profile err:', e.message); }

  try {
    console.log('Moving right...');
    await device.ptzMove({ speed: { x: 0.6, y: 0, z: 0 }, timeout: 800 });
    await new Promise(r => setTimeout(r, 900));
    await device.ptzStop();
    console.log('PTZ MOVE ok');
  } catch (e) { console.log('ptzMove err:', e.message); }

  try {
    console.log('Tilt down...');
    await device.ptzMove({ speed: { x: 0, y: -0.6, z: 0 }, timeout: 800 });
    await new Promise(r => setTimeout(r, 900));
    await device.ptzStop();
    console.log('PTZ TILT ok');
  } catch (e) { console.log('ptz tilt err:', e.message); }

  process.exit(0);
})().catch(e => { console.log('ERR:', e.message); process.exit(1); });
