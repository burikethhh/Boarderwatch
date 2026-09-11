const onvif = require('node-onvif');
const soapMod = require('node-onvif/lib/modules/soap.js');
const mUrl = require('url');

const USER = 'admin123', PASS = 'admin1234';
const d = new onvif.OnvifDevice({ xaddr: 'http://192.168.254.129:2020/onvif/device_service', user: USER, pass: PASS });

function call(xaddr, action, body) {
  return new Promise((resolve, reject) => {
    const oxaddr = mUrl.parse(xaddr);
    oxaddr.auth = USER + ':' + PASS;
    const soap = soapMod.createRequestSoap({
      body,
      xmlns: ['xmlns:timg="http://www.onvif.org/ver20/imaging/wsdl"', 'xmlns:tt="http://www.onvif.org/ver10/schema"'],
      diff: 1000, user: USER, pass: PASS,
    });
    soapMod.requestCommand(oxaddr, action, soap).then(resolve).catch(reject);
  });
}

(async () => {
  await d.init();
  const xaddr = d.services.imaging && d.services.imaging.xaddr ? d.services.imaging.xaddr : 'http://192.168.254.129:2020/onvif/imaging_service';
  const token = 'raw_vs1';

  const get = await call(xaddr, 'GetImagingSettings',
    `<timg:GetImagingSettings><timg:VideoSourceToken>${token}</timg:VideoSourceToken></timg:GetImagingSettings>`);
  console.log('GET:', JSON.stringify(get.data).slice(0, 500));

  // try setting IR-cut filter ON (force IR / night vision)
  const set = await call(xaddr, 'SetImagingSettings',
    `<timg:SetImagingSettings><timg:VideoSourceToken>${token}</timg:VideoSourceToken>` +
    `<timg:ImagingSettings><tt:IrCutFilter>ON</tt:IrCutFilter></timg:ImagingSettings>` +
    `<timg:ForcePersistence>true</timg:ForcePersistence></timg:SetImagingSettings>`);
  console.log('SET ON ok:', JSON.stringify(set.data || {}).slice(0, 200));
  process.exit(0);
})().catch(e => { console.log('ERR:', e.message); process.exit(1); });
