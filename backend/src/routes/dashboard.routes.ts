import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { query } from '../config/database.js';
import { buildRoleWhereClause } from '../middleware/roles.js';

export async function dashboardRoutes(fastify: FastifyInstance) {
  // Dashboard overview
  fastify.get(
    '/api/dashboard/overview',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const roleFilter = buildRoleWhereClause(request.user);
      const params = roleFilter.params;

      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [totalResult, todayResult, weekResult, monthResult, criticalResult] = await Promise.all([
        query<{ count: string }>(
          `SELECT COUNT(*) as count FROM issues i
           LEFT JOIN users u ON i.responsible_cc_id = u.id
           WHERE ${roleFilter.clause}`,
          params
        ),
        query<{ count: string }>(
          `SELECT COUNT(*) as count FROM issues i
           LEFT JOIN users u ON i.responsible_cc_id = u.id
           WHERE ${roleFilter.clause} AND i.issue_date = $${params.length + 1}`,
          [...params, today]
        ),
        query<{ count: string }>(
          `SELECT COUNT(*) as count FROM issues i
           LEFT JOIN users u ON i.responsible_cc_id = u.id
           WHERE ${roleFilter.clause} AND i.issue_date >= $${params.length + 1}`,
          [...params, weekAgo]
        ),
        query<{ count: string }>(
          `SELECT COUNT(*) as count FROM issues i
           LEFT JOIN users u ON i.responsible_cc_id = u.id
           WHERE ${roleFilter.clause} AND i.issue_date >= $${params.length + 1}`,
          [...params, monthAgo]
        ),
        query<{ count: string }>(
          `SELECT COUNT(*) as count FROM issues i
           LEFT JOIN users u ON i.responsible_cc_id = u.id
           WHERE ${roleFilter.clause} AND i.issue_rate = 3`,
          params
        ),
      ]);

      return reply.send({
        total_issues: parseInt(totalResult.rows[0]?.count || '0', 10),
        issues_today: parseInt(todayResult.rows[0]?.count || '0', 10),
        issues_this_week: parseInt(weekResult.rows[0]?.count || '0', 10),
        issues_this_month: parseInt(monthResult.rows[0]?.count || '0', 10),
        critical_issues: parseInt(criticalResult.rows[0]?.count || '0', 10),
      });
    }
  );

  // Trends (daily counts for last 30 days)
  fastify.get(
    '/api/dashboard/trends',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const roleFilter = buildRoleWhereClause(request.user);
      const params = roleFilter.params;
      const queryParams = request.query as Record<string, string>;

      const days = parseInt(queryParams.days || '30', 10);
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const result = await query<{ date: string; count: string }>(
        `SELECT
           i.issue_date::date as date,
           COUNT(*) as count
         FROM issues i
         LEFT JOIN users u ON i.responsible_cc_id = u.id
         WHERE ${roleFilter.clause} AND i.issue_date >= $${params.length + 1}
         GROUP BY i.issue_date::date
         ORDER BY date ASC`,
        [...params, startDate]
      );

      // Fill in missing dates
      const trends: { date: string; count: number }[] = [];
      const dataMap = new Map(result.rows.map((r) => [r.date, parseInt(r.count, 10)]));

      for (let i = 0; i < days; i++) {
        const date = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        trends.push({
          date: dateStr,
          count: dataMap.get(dateStr) || 0,
        });
      }

      return reply.send({ trends });
    }
  );

  // Issues by team
  fastify.get(
    '/api/dashboard/by-team',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const roleFilter = buildRoleWhereClause(request.user);
      const params = roleFilter.params;

      const result = await query<{ team: string; count: string; rate_1: string; rate_2: string; rate_3: string }>(
        `SELECT
           COALESCE(u.team, 'Unknown') as team,
           COUNT(*) as count,
           COUNT(*) FILTER (WHERE i.issue_rate = 1) as rate_1,
           COUNT(*) FILTER (WHERE i.issue_rate = 2) as rate_2,
           COUNT(*) FILTER (WHERE i.issue_rate = 3) as rate_3
         FROM issues i
         LEFT JOIN users u ON i.responsible_cc_id = u.id
         WHERE ${roleFilter.clause}
         GROUP BY COALESCE(u.team, 'Unknown')
         ORDER BY count DESC`,
        params
      );

      return reply.send({
        by_team: result.rows.map((r) => ({
          team: r.team,
          count: parseInt(r.count, 10),
          rate_1: parseInt(r.rate_1, 10),
          rate_2: parseInt(r.rate_2, 10),
          rate_3: parseInt(r.rate_3, 10),
        })),
      });
    }
  );

  // Issues by CC (top performers/issues)
  fastify.get(
    '/api/dashboard/by-cc',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const roleFilter = buildRoleWhereClause(request.user);
      const params = roleFilter.params;
      const queryParams = request.query as Record<string, string>;

      const limit = parseInt(queryParams.limit || '10', 10);

      const result = await query<{
        cc_id: number;
        cc_name: string;
        team: string;
        count: string;
        rate_avg: string;
      }>(
        `SELECT
           COALESCE(i.responsible_cc_id, 0) as cc_id,
           COALESCE(u.full_name, i.responsible_cc_name, 'Unknown') as cc_name,
           COALESCE(u.team, 'Unknown') as team,
           COUNT(*) as count,
           ROUND(AVG(i.issue_rate)::numeric, 2) as rate_avg
         FROM issues i
         LEFT JOIN users u ON i.responsible_cc_id = u.id
         WHERE ${roleFilter.clause}
         GROUP BY COALESCE(i.responsible_cc_id, 0), COALESCE(u.full_name, i.responsible_cc_name, 'Unknown'), COALESCE(u.team, 'Unknown')
         ORDER BY count DESC
         LIMIT $${params.length + 1}`,
        [...params, limit]
      );

      return reply.send({
        by_cc: result.rows.map((r) => ({
          cc_id: r.cc_id,
          cc_name: r.cc_name,
          team: r.team,
          count: parseInt(r.count, 10),
          rate_avg: parseFloat(r.rate_avg) || null,
        })),
      });
    }
  );

  // Issues by source
  fastify.get(
    '/api/dashboard/by-source',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const roleFilter = buildRoleWhereClause(request.user);
      const params = roleFilter.params;

      const result = await query<{ source: string; display_name: string; count: string }>(
        `SELECT
           s.name as source,
           s.display_name,
           COUNT(*) as count
         FROM issues i
         LEFT JOIN issue_sources s ON i.source_id = s.id
         LEFT JOIN users u ON i.responsible_cc_id = u.id
         WHERE ${roleFilter.clause}
         GROUP BY s.name, s.display_name
         ORDER BY count DESC`,
        params
      );

      return reply.send({
        by_source: result.rows.map((r) => ({
          source: r.source,
          display_name: r.display_name,
          count: parseInt(r.count, 10),
        })),
      });
    }
  );
}
