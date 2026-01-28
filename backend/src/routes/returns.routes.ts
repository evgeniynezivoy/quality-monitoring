import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import '../types/fastify.js';
import { authenticate } from '../middleware/auth.js';
import { query } from '../config/database.js';
import { buildRoleWhereClause } from '../middleware/roles.js';
import { syncReturns, getReturnsSyncLogs } from '../services/returns-sync.service.js';

export async function returnsRoutes(fastify: FastifyInstance) {
  // Get returns list with pagination and filters
  fastify.get(
    '/api/returns',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const roleFilter = buildRoleWhereClause(request.user, 'r.cc_user_id', 'u');
      const params = [...roleFilter.params];
      const queryParams = request.query as Record<string, string>;

      const page = parseInt(queryParams.page || '1', 10);
      const limit = parseInt(queryParams.limit || '50', 10);
      const offset = (page - 1) * limit;

      // Build WHERE conditions
      const conditions: string[] = [roleFilter.clause];

      if (queryParams.date_from) {
        params.push(queryParams.date_from);
        conditions.push(`r.return_date >= $${params.length}`);
      }

      if (queryParams.date_to) {
        params.push(queryParams.date_to);
        conditions.push(`r.return_date <= $${params.length}`);
      }

      if (queryParams.cc_user_id) {
        params.push(queryParams.cc_user_id);
        conditions.push(`r.cc_user_id = $${params.length}`);
      }

      if (queryParams.block) {
        params.push(queryParams.block);
        conditions.push(`r.block = $${params.length}`);
      }

      if (queryParams.search) {
        params.push(`%${queryParams.search}%`);
        conditions.push(`(
          r.client_name ILIKE $${params.length} OR
          r.cid ILIKE $${params.length} OR
          r.cc_abbreviation ILIKE $${params.length} OR
          u.full_name ILIKE $${params.length}
        )`);
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countResult = await query(
        `SELECT COUNT(*) as total
         FROM returns r
         LEFT JOIN users u ON r.cc_user_id = u.id
         WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0]?.total || '0', 10);

      // Get paginated data
      params.push(limit, offset);
      const dataResult = await query(
        `SELECT
           r.id,
           r.return_date,
           r.client_name,
           r.block,
           r.cid,
           r.cc_abbreviation,
           r.cc_user_id,
           u.full_name as cc_name,
           r.team_lead_name,
           r.reasons,
           r.total_leads,
           r.created_at
         FROM returns r
         LEFT JOIN users u ON r.cc_user_id = u.id
         WHERE ${whereClause}
         ORDER BY r.return_date DESC, r.id DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      return reply.send({
        data: dataResult.rows,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
      });
    }
  );

  // Get returns overview/stats
  fastify.get(
    '/api/returns/overview',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const roleFilter = buildRoleWhereClause(request.user, 'r.cc_user_id', 'u');
      const params = roleFilter.params;

      const result = await query(
        `SELECT
           COUNT(*) as total_returns,
           SUM(r.total_leads) as total_leads,
           COUNT(*) FILTER (WHERE r.return_date >= CURRENT_DATE - INTERVAL '7 days') as this_week,
           COUNT(*) FILTER (WHERE r.return_date >= DATE_TRUNC('month', CURRENT_DATE)) as this_month,
           SUM(r.total_leads) FILTER (WHERE r.return_date >= DATE_TRUNC('month', CURRENT_DATE)) as leads_this_month
         FROM returns r
         LEFT JOIN users u ON r.cc_user_id = u.id
         WHERE ${roleFilter.clause}`,
        params
      );

      const stats = result.rows[0] || {};

      return reply.send({
        total_returns: parseInt(stats.total_returns || '0', 10),
        total_leads: parseInt(stats.total_leads || '0', 10),
        this_week: parseInt(stats.this_week || '0', 10),
        this_month: parseInt(stats.this_month || '0', 10),
        leads_this_month: parseInt(stats.leads_this_month || '0', 10),
      });
    }
  );

  // Get returns by CC (top performers)
  fastify.get(
    '/api/returns/by-cc',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const roleFilter = buildRoleWhereClause(request.user, 'r.cc_user_id', 'u');
      const params = roleFilter.params;
      const queryParams = request.query as Record<string, string>;
      const limit = parseInt(queryParams.limit || '20', 10);

      params.push(limit);
      const result = await query(
        `SELECT
           r.cc_user_id,
           COALESCE(u.full_name, r.cc_abbreviation, 'Unknown') as cc_name,
           r.cc_abbreviation,
           COALESCE(tl.full_name, r.team_lead_name) as team_lead,
           COUNT(*) as return_count,
           SUM(r.total_leads) as total_leads,
           COUNT(*) FILTER (WHERE r.return_date >= DATE_TRUNC('month', CURRENT_DATE)) as this_month,
           COUNT(*) FILTER (WHERE r.return_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
                            AND r.return_date < DATE_TRUNC('month', CURRENT_DATE)) as last_month
         FROM returns r
         LEFT JOIN users u ON r.cc_user_id = u.id
         LEFT JOIN users tl ON u.team_lead_id = tl.id
         WHERE ${roleFilter.clause}
         GROUP BY r.cc_user_id, COALESCE(u.full_name, r.cc_abbreviation, 'Unknown'), r.cc_abbreviation, COALESCE(tl.full_name, r.team_lead_name)
         ORDER BY return_count DESC
         LIMIT $${params.length}`,
        params
      );

      return reply.send({
        by_cc: result.rows.map(row => ({
          cc_user_id: row.cc_user_id,
          cc_name: row.cc_name,
          cc_abbreviation: row.cc_abbreviation,
          team_lead: row.team_lead,
          return_count: parseInt(row.return_count, 10),
          total_leads: parseInt(row.total_leads || '0', 10),
          this_month: parseInt(row.this_month, 10),
          last_month: parseInt(row.last_month, 10),
        })),
      });
    }
  );

  // Get returns by reason
  fastify.get(
    '/api/returns/by-reason',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const roleFilter = buildRoleWhereClause(request.user, 'r.cc_user_id', 'u');
      const params = roleFilter.params;

      // Extract reasons from JSONB and aggregate
      const result = await query(
        `SELECT
           reason_data->>'reason' as reason,
           SUM((reason_data->>'count')::int) as total_count,
           COUNT(*) as return_count
         FROM returns r
         LEFT JOIN users u ON r.cc_user_id = u.id,
         jsonb_array_elements(r.reasons) as reason_data
         WHERE ${roleFilter.clause}
           AND r.return_date >= DATE_TRUNC('month', CURRENT_DATE)
         GROUP BY reason_data->>'reason'
         ORDER BY total_count DESC
         LIMIT 20`,
        params
      );

      return reply.send({
        by_reason: result.rows.map(row => ({
          reason: row.reason,
          total_count: parseInt(row.total_count || '0', 10),
          return_count: parseInt(row.return_count, 10),
        })),
      });
    }
  );

  // Get returns trends (daily counts)
  fastify.get(
    '/api/returns/trends',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const roleFilter = buildRoleWhereClause(request.user, 'r.cc_user_id', 'u');
      const params = roleFilter.params;
      const queryParams = request.query as Record<string, string>;
      const days = parseInt(queryParams.days || '30', 10);

      params.push(days);
      const result = await query(
        `SELECT
           r.return_date::date as date,
           COUNT(*) as return_count,
           SUM(r.total_leads) as total_leads
         FROM returns r
         LEFT JOIN users u ON r.cc_user_id = u.id
         WHERE ${roleFilter.clause}
           AND r.return_date >= CURRENT_DATE - ($${params.length} || ' days')::interval
         GROUP BY r.return_date::date
         ORDER BY date ASC`,
        params
      );

      // Fill in missing dates
      const trends: { date: string; return_count: number; total_leads: number }[] = [];
      const dataMap = new Map(result.rows.map(r => {
        const dateVal = r.date as unknown;
        const dateStr = dateVal instanceof Date
          ? dateVal.toISOString().split('T')[0]
          : String(r.date).split('T')[0];
        return [dateStr, {
          return_count: parseInt(r.return_count, 10),
          total_leads: parseInt(r.total_leads || '0', 10),
        }];
      }));

      for (let i = 0; i < days; i++) {
        const date = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const data = dataMap.get(dateStr);
        trends.push({
          date: dateStr,
          return_count: data?.return_count || 0,
          total_leads: data?.total_leads || 0,
        });
      }

      return reply.send({ trends });
    }
  );

  // Trigger returns sync (admin only)
  fastify.post(
    '/api/returns/sync',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (request.user?.role !== 'admin') {
        return reply.status(403).send({ error: 'Admin access required' });
      }

      try {
        const result = await syncReturns();
        return reply.send({
          success: true,
          ...result,
        });
      } catch (err: any) {
        return reply.status(500).send({
          success: false,
          error: err.message,
        });
      }
    }
  );

  // Get returns sync logs
  fastify.get(
    '/api/returns/sync/logs',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const queryParams = request.query as Record<string, string>;
      const limit = parseInt(queryParams.limit || '20', 10);

      const logs = await getReturnsSyncLogs(limit);
      return reply.send({ logs });
    }
  );
}
