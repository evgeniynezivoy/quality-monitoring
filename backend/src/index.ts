import { buildApp } from './app.js';
import { env } from './config/env.js';
import { testConnection } from './config/database.js';
import { syncAllSources } from './services/sync.service.js';
import { sendAllDailyReports } from './services/report.service.js';
import { verifyEmailConnection } from './config/email.js';
import cron from 'node-cron';

async function main() {
  // Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('Failed to connect to database. Exiting...');
    process.exit(1);
  }

  // Build and start app
  const app = await buildApp();

  try {
    await app.listen({ port: env.port, host: env.host });
    console.log(`Server running on http://${env.host}:${env.port}`);

    // Schedule sync cron job
    if (env.google.serviceAccountEmail && env.google.privateKey) {
      const cronExpression = `*/${env.syncIntervalMinutes} * * * *`;
      console.log(`Scheduling sync every ${env.syncIntervalMinutes} minutes`);

      cron.schedule(cronExpression, async () => {
        console.log('Starting scheduled sync...');
        try {
          const results = await syncAllSources();
          const summary = results.map((r) => ({
            source: r.source_id,
            status: r.status,
            inserted: r.rows_inserted,
            updated: r.rows_updated,
          }));
          console.log('Sync completed:', summary);
        } catch (error) {
          console.error('Scheduled sync failed:', error);
        }
      });
    } else {
      console.warn('Google Sheets credentials not configured. Sync disabled.');
    }

    // Schedule daily report cron job - 7 AM EST = 12:00 UTC
    const reportSchedule = process.env.DAILY_REPORT_SCHEDULE || '0 12 * * *';
    if (process.env.ENABLE_DAILY_REPORTS !== 'false') {
      const emailOk = await verifyEmailConnection();
      if (emailOk) {
        console.log(`Scheduling daily reports at ${reportSchedule} (7 AM EST)`);
        cron.schedule(reportSchedule, async () => {
          console.log('Starting scheduled daily reports...');
          try {
            const results = await sendAllDailyReports();
            console.log('Operations report:', results.operationsReport.message);
            const sentReports = results.teamLeadReports.filter(r => r.issueCount && r.issueCount > 0);
            console.log(`Team Lead reports sent: ${sentReports.length}`);
            sentReports.forEach(r => {
              console.log(`  - ${r.teamLead}: ${r.issueCount} issues`);
            });
          } catch (error) {
            console.error('Daily reports failed:', error);
          }
        });
      } else {
        console.warn('Email not configured. Daily reports disabled.');
      }
    }
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(`\nReceived ${signal}. Shutting down...`);
      await app.close();
      process.exit(0);
    });
  });
}

main();
