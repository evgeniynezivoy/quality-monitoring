import { buildApp } from './app.js';
import { env } from './config/env.js';
import { testConnection } from './config/database.js';
import { syncAllSources } from './services/sync.service.js';
import { sendDailyReport, getReportRecipients } from './services/report.service.js';
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

    // Schedule daily report cron job
    const reportSchedule = process.env.DAILY_REPORT_SCHEDULE || '0 8 * * *'; // 8:00 AM UTC
    if (process.env.ENABLE_DAILY_REPORTS !== 'false') {
      // Verify email connection
      const emailOk = await verifyEmailConnection();
      if (emailOk) {
        console.log(`Scheduling daily reports: ${reportSchedule}`);
        cron.schedule(reportSchedule, async () => {
          console.log('Starting scheduled daily report...');
          try {
            const recipients = await getReportRecipients();
            if (recipients.length > 0) {
              const result = await sendDailyReport(recipients);
              console.log('Daily report result:', result.message);
            } else {
              console.log('No recipients configured for daily report');
            }
          } catch (error) {
            console.error('Daily report failed:', error);
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
