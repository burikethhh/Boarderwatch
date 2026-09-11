const tapo = require('tp-link-tapo-connect');

(async () => {
  const host = '192.168.254.129';
  const attempts = [
    ['cloud', 'kethaguacito@gmail.com', 'Totogwapo_123'],
    ['camera', 'admin123', 'admin1234'],
  ];
  for (const [label, user, pass] of attempts) {
    try {
      const dev = await tapo.loginDeviceByIp(user, pass, host);
      console.log(label, 'LOGIN OK');
      try {
        const info = await dev.getDeviceInfo();
        console.log(label, 'INFO:', JSON.stringify(info).slice(0, 300));
      } catch (e) { console.log(label, 'info err:', e.message); }
      process.exit(0);
    } catch (e) {
      console.log(label, 'ERR:', e.message);
    }
  }
  process.exit(1);
})();
