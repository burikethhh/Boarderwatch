const cron = require('node-cron');
const { checkLeaseExpiry } = require('./services/notification.service');
const { checkCameraHealth } = require('./services/health.service');

let scheduledTasks = [];

/**
 * Start all cron jobs
 */
function startCronJobs() {
  console.log('[Cron] Starting scheduled tasks...');

  // Check lease expiry every day at 8:00 AM
  const leaseCheck = cron.schedule('0 8 * * *', async () => {
    console.log('[Cron] Running lease expiry check...');
    try {
      await checkLeaseExpiry();
    } catch (err) {
      console.error('[Cron] Lease expiry check failed:', err.message);
    }
  }, { timezone: 'Asia/Manila' });

  // Check camera health every 5 minutes
  const healthCheck = cron.schedule('*/5 * * * *', async () => {
    try {
      await checkCameraHealth();
    } catch (err) {
      console.error('[Cron] Camera health check failed:', err.message);
    }
  });

  scheduledTasks.push(leaseCheck, healthCheck);
  console.log('[Cron] Scheduled tasks started:');
  console.log('  - Lease expiry check: daily at 8:00 AM');
  console.log('  - Camera health check: every 5 minutes');
}

/**
 * Stop all cron jobs
 */
function stopCronJobs() {
  scheduledTasks.forEach(task => task.stop());
  scheduledTasks = [];
  console.log('[Cron] All scheduled tasks stopped');
}

module.exports = { startCronJobs, stopCronJobs };
