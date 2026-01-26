import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import '../types/fastify.js';
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
      const dataMap = new Map(result.rows.map((r) => {
        // Convert date to string format YYYY-MM-DD
        // PostgreSQL may return Date object or string depending on driver
        const dateVal = r.date as unknown;
        const dateStr = dateVal instanceof Date
          ? dateVal.toISOString().split('T')[0]
          : String(r.date).split('T')[0];
        return [dateStr, parseInt(r.count, 10)];
      }));

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

  // CC Performance with trends (analytics)
  fastify.get(
    '/api/dashboard/cc-analytics',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const roleFilter = buildRoleWhereClause(request.user);
      const params = roleFilter.params;

      // Get CC stats with current week, last week, current month comparison
      const result = await query<{
        cc_id: number;
        cc_name: string;
        team: string;
        team_lead_name: string;
        total_issues: string;
        this_week: string;
        last_week: string;
        this_month: string;
        last_month: string;
        sources: string[];
      }>(
        `WITH date_ranges AS (
          SELECT
            CURRENT_DATE - INTERVAL '7 days' as week_start,
            CURRENT_DATE - INTERVAL '14 days' as last_week_start,
            DATE_TRUNC('month', CURRENT_DATE) as month_start,
            DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month' as last_month_start,
            DATE_TRUNC('month', CURRENT_DATE) as last_month_end
        )
        SELECT
          COALESCE(i.responsible_cc_id, 0) as cc_id,
          COALESCE(u.full_name, i.responsible_cc_name, 'Unknown') as cc_name,
          COALESCE(u.team, 'Unknown') as team,
          COALESCE(tl.full_name, 'N/A') as team_lead_name,
          COUNT(*) as total_issues,
          COUNT(*) FILTER (WHERE i.issue_date >= (SELECT week_start FROM date_ranges)) as this_week,
          COUNT(*) FILTER (WHERE i.issue_date >= (SELECT last_week_start FROM date_ranges) AND i.issue_date < (SELECT week_start FROM date_ranges)) as last_week,
          COUNT(*) FILTER (WHERE i.issue_date >= (SELECT month_start FROM date_ranges)) as this_month,
          COUNT(*) FILTER (WHERE i.issue_date >= (SELECT last_month_start FROM date_ranges) AND i.issue_date < (SELECT last_month_end FROM date_ranges)) as last_month,
          ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL AND i.issue_date >= (SELECT week_start FROM date_ranges)) as sources
        FROM issues i
        LEFT JOIN users u ON i.responsible_cc_id = u.id
        LEFT JOIN users tl ON u.team_lead_id = tl.id
        LEFT JOIN issue_sources s ON i.source_id = s.id
        WHERE ${roleFilter.clause}
        GROUP BY COALESCE(i.responsible_cc_id, 0), COALESCE(u.full_name, i.responsible_cc_name, 'Unknown'), COALESCE(u.team, 'Unknown'), COALESCE(tl.full_name, 'N/A')
        ORDER BY total_issues DESC`,
        params
      );

      return reply.send({
        cc_analytics: result.rows.map((r) => {
          const thisWeek = parseInt(r.this_week, 10);
          const lastWeek = parseInt(r.last_week, 10);
          const weekTrend = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : (thisWeek > 0 ? 100 : 0);

          const thisMonth = parseInt(r.this_month, 10);
          const lastMonth = parseInt(r.last_month, 10);
          const monthTrend = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : (thisMonth > 0 ? 100 : 0);

          return {
            cc_id: r.cc_id,
            cc_name: r.cc_name,
            team: r.team,
            team_lead: r.team_lead_name,
            total_issues: parseInt(r.total_issues, 10),
            this_week: thisWeek,
            last_week: lastWeek,
            week_trend: weekTrend,
            this_month: thisMonth,
            last_month: lastMonth,
            month_trend: monthTrend,
            sources: r.sources || [],
            status: weekTrend < 0 ? 'improving' : weekTrend > 0 ? 'declining' : 'stable',
          };
        }),
      });
    }
  );

  // Team Performance with trends
  fastify.get(
    '/api/dashboard/team-analytics',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const roleFilter = buildRoleWhereClause(request.user);
      const params = roleFilter.params;

      const result = await query<{
        team: string;
        team_lead_name: string;
        cc_count: string;
        total_issues: string;
        this_week: string;
        last_week: string;
        this_month: string;
        critical_count: string;
        avg_rate: string;
      }>(
        `WITH date_ranges AS (
          SELECT
            CURRENT_DATE - INTERVAL '7 days' as week_start,
            CURRENT_DATE - INTERVAL '14 days' as last_week_start
        )
        SELECT
          COALESCE(u.team, 'Unknown') as team,
          MAX(tl.full_name) as team_lead_name,
          COUNT(DISTINCT i.responsible_cc_id) as cc_count,
          COUNT(*) as total_issues,
          COUNT(*) FILTER (WHERE i.issue_date >= (SELECT week_start FROM date_ranges)) as this_week,
          COUNT(*) FILTER (WHERE i.issue_date >= (SELECT last_week_start FROM date_ranges) AND i.issue_date < (SELECT week_start FROM date_ranges)) as last_week,
          COUNT(*) FILTER (WHERE i.issue_date >= DATE_TRUNC('month', CURRENT_DATE)) as this_month,
          COUNT(*) FILTER (WHERE i.issue_rate = 3) as critical_count,
          ROUND(AVG(i.issue_rate)::numeric, 2) as avg_rate
        FROM issues i
        LEFT JOIN users u ON i.responsible_cc_id = u.id
        LEFT JOIN users tl ON u.team_lead_id = tl.id
        WHERE ${roleFilter.clause}
        GROUP BY COALESCE(u.team, 'Unknown')
        ORDER BY total_issues DESC`,
        params
      );

      return reply.send({
        team_analytics: result.rows.map((r) => {
          const thisWeek = parseInt(r.this_week, 10);
          const lastWeek = parseInt(r.last_week, 10);
          const weekTrend = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0;

          return {
            team: r.team,
            team_lead: r.team_lead_name || 'N/A',
            cc_count: parseInt(r.cc_count, 10),
            total_issues: parseInt(r.total_issues, 10),
            this_week: thisWeek,
            last_week: lastWeek,
            week_trend: weekTrend,
            this_month: parseInt(r.this_month, 10),
            critical_count: parseInt(r.critical_count, 10),
            avg_rate: parseFloat(r.avg_rate) || null,
            status: weekTrend < -10 ? 'improving' : weekTrend > 10 ? 'declining' : 'stable',
          };
        }),
      });
    }
  );
}
