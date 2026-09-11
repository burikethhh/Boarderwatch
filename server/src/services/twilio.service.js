// Twilio SMS service has been deprecated and disabled per project requirements.
// System notifications are handled via in-app dashboard alerts and email notifications.

async function sendSMS() {
  return { success: false, disabled: true, message: 'SMS feature removed' };
}

async function sendMotionAlert() {
  return { success: false, disabled: true };
}

async function sendLeaseExpiryAlert() {
  return { success: false, disabled: true };
}

module.exports = { sendSMS, sendMotionAlert, sendLeaseExpiryAlert };
