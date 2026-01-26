import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import '../types/fastify.js';
import { authenticate } from '../middleware/auth.js';
import { getIssues, getIssueById, getIssueStats } from '../services/issues.service.js';
import { IssueFilters } from '../types/index.js';

export async function issuesRoutes(fastify: FastifyInstance) {
  // List issues with filters
  fastify.get(
    '/api/issues',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as Record<string, string>;

      const filters: IssueFilters = {
        page: query.page ? parseInt(query.page, 10) : 1,
        limit: query.limit ? parseInt(query.limit, 10) : 20,
        date_from: query.date_from,
        date_to: query.date_to,
        source: query.source,
        team_lead_id: query.team_lead_id ? parseInt(query.team_lead_id, 10) : undefined,
        responsible_cc_id: query.responsible_cc_id ? parseInt(query.responsible_cc_id, 10) : undefined,
        issue_rate: query.issue_rate ? parseInt(query.issue_rate, 10) : undefined,
        issue_category: query.issue_category as 'client' | 'internal' | undefined,
        search: query.search,
      };

      const result = await getIssues(filters, request.user);
      return reply.send(result);
    }
  );

  // Get single issue
  fastify.get(
    '/api/issues/:id',
    { preHandler: authenticate },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const id = parseInt(request.params.id, 10);

      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid issue ID' });
      }

      const issue = await getIssueById(id);

      if (!issue) {
        return reply.status(404).send({ error: 'Issue not found' });
      }

      // Check access based on role
      if (request.user.role === 'cc' && issue.responsible_cc_id !== request.user.userId) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      return reply.send(issue);
    }
  );

  // Get issue statistics
  fastify.get(
    '/api/issues/stats',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as Record<string, string>;

      const stats = await getIssueStats(
        request.user,
        query.date_from,
        query.date_to
      );

      return reply.send(stats);
    }
  );

  // Export issues to CSV
  fastify.get(
    '/api/issues/export',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const queryParams = request.query as Record<string, string>;

      const filters: IssueFilters = {
        page: 1,
        limit: 10000, // Max export
        date_from: queryParams.date_from,
        date_to: queryParams.date_to,
        source: queryParams.source,
        responsible_cc_id: queryParams.responsible_cc_id ? parseInt(queryParams.responsible_cc_id, 10) : undefined,
        issue_rate: queryParams.issue_rate ? parseInt(queryParams.issue_rate, 10) : undefined,
        issue_category: queryParams.issue_category as 'client' | 'internal' | undefined,
      };

      const result = await getIssues(filters, request.user);

      // Build CSV
      const headers = [
        'ID',
        'Date',
        'Source',
        'CC Name',
        'CID',
        'Issue Type',
        'Rate',
        'Category',
        'Comment',
        'Reported By',
      ];

      const rows = result.data.map((issue) => [
        issue.id,
        issue.issue_date,
        issue.source_name,
        issue.cc_name || issue.responsible_cc_name || '',
        issue.cid || '',
        issue.issue_type,
        issue.issue_rate || '',
        issue.issue_category || '',
        (issue.comment || '').replace(/"/g, '""'),
        issue.reported_by || '',
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename=issues-export.csv');
      return reply.send(csv);
    }
  );
}
