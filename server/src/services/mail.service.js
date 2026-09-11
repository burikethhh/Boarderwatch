/**
 * BoardersWatch Mail Service
 * Free / low-cost email delivery with automatic provider selection.
 *
 * Supported providers (all free tiers available):
 *   - brevo       : https://www.brevo.com        (300 free emails/day)   needs brevo_api_key + mail_from
 *   - resend      : https://resend.com           (100 free emails/day)   needs resend_api_key + mail_from
 *   - web3forms   : https://web3forms.com        (250 free / month)      needs web3forms_key
 *   - formsubmit  : https://formsubmit.co        (free, no signup)       sends to the recipient directly
 *   - smtp        : any SMTP incl. Gmail App Password                      needs smtp_host/port/user/pass + mail_from
 *   - sendgrid    : legacy SendGrid API                                    needs sendgrid_api_key + sendgrid_from_email
 *
 * Any provider can be forced via the `email_provider` setting, otherwise
 * the first configured provider in priority order is used.
 */

const { getDatabase } = require('../config/database');

function db() {
  const d = getDatabase();
  d.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  return d;
}

function get(key) {
  const row = db().prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row && row.value ? row.value : null;
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getFrom() {
  return get('mail_from') || get('sendgrid_from_email') || get('smtp_user') || null;
}

async function postJson(url, body, headers = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch { try { data = await res.text(); } catch {} }
  if (!res.ok) {
    const msg = (data && (data.message || data.error || data.msg)) || (typeof data === 'string' ? data : `HTTP ${res.status}`);
    throw new Error(msg);
  }
  return data;
}

// ---- individual providers -------------------------------------------------

async function sendBrevo(to, subject, html, text) {
  const key = get('brevo_api_key');
  const from = getFrom();
  if (!key || !from) return { attempted: false };
  await postJson(
    'https://api.brevo.com/v3/smtp/email',
    { sender: { email: from, name: 'BoardersWatch' }, to: [{ email: to }], subject, htmlContent: html, textContent: text },
    { 'api-key': key, accept: 'application/json' }
  );
  return { attempted: true, success: true, provider: 'brevo' };
}

async function sendResend(to, subject, html, text) {
  const key = get('resend_api_key');
  const from = getFrom();
  if (!key || !from) return { attempted: false };
  await postJson(
    'https://api.resend.com/emails',
    { from, to: [to], subject, html, text },
    { Authorization: `Bearer ${key}` }
  );
  return { attempted: true, success: true, provider: 'resend' };
}

async function sendWeb3Forms(to, subject, html, text) {
  const key = get('web3forms_key');
  if (!key) return { attempted: false };
  await postJson('https://api.web3forms.com/submit', {
    access_key: key,
    subject,
    from_name: 'BoardersWatch',
    email: getFrom() || to,
    message: text || subject,
  });
  return { attempted: true, success: true, provider: 'web3forms' };
}

async function sendFormSubmit(to, subject, html, text) {
  const enabled = get('email_provider') === 'formsubmit' || get('formsubmit_enabled') === '1';
  if (!enabled) return { attempted: false };
  const recipient = to || get('contact_email');
  if (!recipient) return { attempted: false };
  await postJson(`https://formsubmit.co/ajax/${encodeURIComponent(recipient)}`, {
    _subject: subject,
    name: 'BoardersWatch',
    message: text || stripHtml(html),
  });
  return { attempted: true, success: true, provider: 'formsubmit' };
}

async function sendSmtp(to, subject, html, text) {
  const host = get('smtp_host');
  const user = get('smtp_user');
  const pass = get('smtp_pass');
  if (!host || !user || !pass) return { attempted: false };
  const nodemailer = require('nodemailer');
  const port = parseInt(get('smtp_port') || '465', 10);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  await transporter.sendMail({ from: getFrom() || user, to, subject, html, text });
  return { attempted: true, success: true, provider: 'smtp' };
}

async function sendSendGrid(to, subject, html, text) {
  const key = get('sendgrid_api_key');
  const from = get('sendgrid_from_email') || getFrom();
  if (!key || !from) return { attempted: false };
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(key);
  await sgMail.send({ to, from, subject, html, text });
  return { attempted: true, success: true, provider: 'sendgrid' };
}

const PROVIDERS = {
  brevo: sendBrevo,
  resend: sendResend,
  web3forms: sendWeb3Forms,
  formsubmit: sendFormSubmit,
  smtp: sendSmtp,
  sendgrid: sendSendGrid,
};

const PRIORITY = ['brevo', 'resend', 'web3forms', 'smtp', 'sendgrid', 'formsubmit'];

/**
 * Send an email using the configured / first available provider.
 * @returns {Promise<{success:boolean, provider?:string, error?:string}>}
 */
async function sendEmail(to, subject, html, text) {
  const textBody = text || stripHtml(html);

  if (!to) return { success: false, error: 'No recipient email' };

  const forced = (get('email_provider') || 'auto').toLowerCase();
  const order = forced === 'auto' ? PRIORITY : [forced, ...PRIORITY.filter(p => p !== forced)];

  for (const name of order) {
    const fn = PROVIDERS[name];
    if (!fn) continue;
    try {
      const r = await fn(to, subject, html, textBody);
      if (r.attempted) {
        if (r.success) console.log(`[Mail] Sent via ${r.provider} to ${to}: ${subject}`);
        return r;
      }
    } catch (err) {
      console.error(`[Mail] ${name} failed:`, err.message);
      return { success: false, provider: name, error: err.message };
    }
  }

  console.log('[Mail] No provider configured - would send to', to, '|', subject);
  return { success: false, error: 'No email provider configured' };
}

async function providerStatus() {
  return {
    provider: get('email_provider') || 'auto',
    configured: {
      brevo: !!get('brevo_api_key'),
      resend: !!get('resend_api_key'),
      web3forms: !!get('web3forms_key'),
      smtp: !!(get('smtp_host') && get('smtp_user') && get('smtp_pass')),
      sendgrid: !!get('sendgrid_api_key'),
      formsubmit: get('email_provider') === 'formsubmit' || get('formsubmit_enabled') === '1',
    },
  };
}

async function sendTestEmail(to) {
  const recipient = to || get('contact_email');
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color:#333;">BoardersWatch Test Email</h2>
      <p>Congratulations! Email notifications are working correctly.</p>
      <p style="color:#666;font-size:12px;">Sent ${new Date().toLocaleString()} - BoardersWatch Boarding House Management System</p>
    </div>`;
  return sendEmail(recipient, '[BoardersWatch] Test Email', html);
}

module.exports = { sendEmail, sendTestEmail, providerStatus, get };
