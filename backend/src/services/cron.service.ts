import cron from 'node-cron';
import { sendDailyReport, getReportRecipients } from './report.service.js';
import { syncAllSources } from './sync.service.js';
import { syncReturns } from './returns-sync.service.js';

// Schedule daily report at 8:00 AM UTC (adjust as needed)
// Cron format: minute hour day-of-month month day-of-week
const DAILY_REPORT_SCHEDULE = process.env.DAILY_REPORT_SCHEDULE || '0 8 * * *';

// Schedule sync every 10 minutes
const SYNC_SCHEDULE = process.env.SYNC_SCHEDULE || '*/10 * * * *';

let dailyReportJob: cron.ScheduledTask | null = null;
let syncJob: cron.ScheduledTask | null = null;

export function startCronJobs(): void {
  // Daily report cron job
  if (process.env.ENABLE_DAILY_REPORTS !== 'false') {
    dailyReportJob = cron.schedule(DAILY_REPORT_SCHEDULE, async () => {
      console.log(`[CRON] Running daily report job at ${new Date().toISOString()}`);
      try {
        const recipients = await getReportRecipients();
        if (recipients.length > 0) {
          const result = await sendDailyReport(recipients);
          console.log(`[CRON] Daily report result:`, result.message);
        } else {
          console.log('[CRON] No recipients configured for daily report');
        }
      } catch (error) {
        console.error('[CRON] Daily report error:', error);
      }
    });
    console.log(`[CRON] Daily report scheduled: ${DAILY_REPORT_SCHEDULE}`);
  }

  // Sync cron job (Issues + Returns)
  if (process.env.ENABLE_AUTO_SYNC !== 'false') {
    syncJob = cron.schedule(SYNC_SCHEDULE, async () => {
      console.log(`[CRON] Running sync job at ${new Date().toISOString()}`);
      try {
        // Sync Issues
        const results = await syncAllSources();
        const successCount = results.filter(r => r.status === 'success').length;
        console.log(`[CRON] Issues sync completed: ${successCount}/${results.length} sources`);

        // Sync Returns
        const returnsResult = await syncReturns();
        console.log(`[CRON] Returns sync completed: ${returnsResult.rows_inserted} inserted, ${returnsResult.rows_updated} updated`);
      } catch (error) {
        console.error('[CRON] Sync error:', error);
      }
    });
    console.log(`[CRON] Auto-sync scheduled: ${SYNC_SCHEDULE} (Issues + Returns)`);
  }
}

export function stopCronJobs(): void {
  if (dailyReportJob) {
    dailyReportJob.stop();
    dailyReportJob = null;
    console.log('[CRON] Daily report job stopped');
  }
  if (syncJob) {
    syncJob.stop();
    syncJob = null;
    console.log('[CRON] Sync job stopped');
  }
}

export function getCronStatus(): {
  dailyReport: { enabled: boolean; schedule: string };
  sync: { enabled: boolean; schedule: string; includes: string[] };
} {
  return {
    dailyReport: {
      enabled: dailyReportJob !== null,
      schedule: DAILY_REPORT_SCHEDULE,
    },
    sync: {
      enabled: syncJob !== null,
      schedule: SYNC_SCHEDULE,
      includes: ['Issues (5 sources)', 'Returns'],
    },
  };
}
