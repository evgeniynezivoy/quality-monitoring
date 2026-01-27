import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import '../types/fastify.js';
import { authenticate } from '../middleware/auth.js';
import {
  getDailyReportData,
  generateReportHtml,
  sendDailyReport,
  getReportRecipients,
} from '../services/report.service.js';
import { verifyEmailConnection } from '../config/email.js';

export async function reportsRoutes(fastify: FastifyInstance) {
  // Get daily report data (preview)
  fastify.get(
    '/api/reports/daily',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const queryParams = request.query as Record<string, string>;
      const date = queryParams.date; // Optional: YYYY-MM-DD format

      const data = await getDailyReportData(date);
      return reply.send(data);
    }
  );

  // Preview report HTML
  fastify.get(
    '/api/reports/daily/preview',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const queryParams = request.query as Record<string, string>;
      const date = queryParams.date;

      const data = await getDailyReportData(date);
      const html = generateReportHtml(data);

      reply.header('Content-Type', 'text/html');
      return reply.send(html);
    }
  );

  // Send daily report manually
  fastify.post(
    '/api/reports/daily/send',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Only admins can send reports
      if (request.user?.role !== 'admin') {
        return reply.status(403).send({ error: 'Admin access required' });
      }

      const body = request.body as { recipients?: string[]; date?: string };
      const recipients = body.recipients || (await getReportRecipients());
      const date = body.date;

      if (recipients.length === 0) {
        return reply.status(400).send({ error: 'No recipients specified' });
      }

      const result = await sendDailyReport(recipients, date);

      if (result.success) {
        return reply.send({
          message: result.message,
          recipients,
          date: result.data?.date,
          totalIssues: result.data?.totalIssues,
        });
      } else {
        return reply.status(500).send({ error: result.message });
      }
    }
  );

  // Test email connection
  fastify.get(
    '/api/reports/test-connection',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (request.user?.role !== 'admin') {
        return reply.status(403).send({ error: 'Admin access required' });
      }

      const isConnected = await verifyEmailConnection();
      return reply.send({
        connected: isConnected,
        smtp_host: process.env.SMTP_HOST || 'mail.itclouddelivery.com',
        smtp_user: process.env.SMTP_USER || 'no-reply@reports.infuse.com',
      });
    }
  );

  // Send test email
  fastify.post(
    '/api/reports/test-send',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (request.user?.role !== 'admin') {
        return reply.status(403).send({ error: 'Admin access required' });
      }

      const body = request.body as { email: string };
      if (!body.email) {
        return reply.status(400).send({ error: 'Email address required' });
      }

      // Send a simple test email
      const result = await sendDailyReport([body.email]);

      if (result.success) {
        return reply.send({
          message: `Test report sent to ${body.email}`,
          totalIssues: result.data?.totalIssues,
        });
      } else {
        return reply.status(500).send({ error: result.message });
      }
    }
  );

  // Get configured recipients
  fastify.get(
    '/api/reports/recipients',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (request.user?.role !== 'admin') {
        return reply.status(403).send({ error: 'Admin access required' });
      }

      const recipients = await getReportRecipients();
      return reply.send({ recipients });
    }
  );
}
