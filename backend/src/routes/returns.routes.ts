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
           r.initial_returns_number,
           r.cc_fault,
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
           COUNT(*) as total_records,
           SUM(r.initial_returns_number) as total_returns,
           SUM(r.cc_fault) as total_cc_fault,
           SUM(r.initial_returns_number) FILTER (WHERE r.return_date >= DATE_TRUNC('month', CURRENT_DATE)) as returns_this_month,
           SUM(r.cc_fault) FILTER (WHERE r.return_date >= DATE_TRUNC('month', CURRENT_DATE)) as cc_fault_this_month,
           SUM(r.initial_returns_number) FILTER (WHERE r.return_date >= CURRENT_DATE - INTERVAL '7 days') as returns_this_week,
           SUM(r.cc_fault) FILTER (WHERE r.return_date >= CURRENT_DATE - INTERVAL '7 days') as cc_fault_this_week
         FROM returns r
         LEFT JOIN users u ON r.cc_user_id = u.id
         WHERE ${roleFilter.clause}`,
        params
      );

      const stats = result.rows[0] || {};

      const totalReturns = parseInt(stats.total_returns || '0', 10);
      const totalCCFault = parseInt(stats.total_cc_fault || '0', 10);
      const returnsThisMonth = parseInt(stats.returns_this_month || '0', 10);
      const ccFaultThisMonth = parseInt(stats.cc_fault_this_month || '0', 10);
      const returnsThisWeek = parseInt(stats.returns_this_week || '0', 10);
      const ccFaultThisWeek = parseInt(stats.cc_fault_this_week || '0', 10);

      return reply.send({
        total_records: parseInt(stats.total_records || '0', 10),
        total_returns: totalReturns,
        total_cc_fault: totalCCFault,
        cc_fault_percent: totalReturns > 0 ? Math.round((totalCCFault / totalReturns) * 100 * 10) / 10 : 0,
        returns_this_month: returnsThisMonth,
        cc_fault_this_month: ccFaultThisMonth,
        cc_fault_percent_this_month: returnsThisMonth > 0 ? Math.round((ccFaultThisMonth / returnsThisMonth) * 100 * 10) / 10 : 0,
        returns_this_week: returnsThisWeek,
        cc_fault_this_week: ccFaultThisWeek,
        cc_fault_percent_this_week: returnsThisWeek > 0 ? Math.round((ccFaultThisWeek / returnsThisWeek) * 100 * 10) / 10 : 0,
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
           COUNT(*) as record_count,
           SUM(r.initial_returns_number) as total_returns,
           SUM(r.cc_fault) as total_cc_fault,
           SUM(r.cc_fault) FILTER (WHERE r.return_date >= DATE_TRUNC('month', CURRENT_DATE)) as cc_fault_this_month,
           SUM(r.cc_fault) FILTER (WHERE r.return_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
                            AND r.return_date < DATE_TRUNC('month', CURRENT_DATE)) as cc_fault_last_month
         FROM returns r
         LEFT JOIN users u ON r.cc_user_id = u.id
         LEFT JOIN users tl ON u.team_lead_id = tl.id
         WHERE ${roleFilter.clause}
         GROUP BY r.cc_user_id, COALESCE(u.full_name, r.cc_abbreviation, 'Unknown'), r.cc_abbreviation, COALESCE(tl.full_name, r.team_lead_name)
         ORDER BY total_cc_fault DESC
         LIMIT $${params.length}`,
        params
      );

      return reply.send({
        by_cc: result.rows.map(row => {
          const totalReturns = parseInt(row.total_returns || '0', 10);
          const totalCCFault = parseInt(row.total_cc_fault || '0', 10);
          return {
            cc_user_id: row.cc_user_id,
            cc_name: row.cc_name,
            cc_abbreviation: row.cc_abbreviation,
            team_lead: row.team_lead,
            record_count: parseInt(row.record_count, 10),
            total_returns: totalReturns,
            total_cc_fault: totalCCFault,
            cc_fault_percent: totalReturns > 0 ? Math.round((totalCCFault / totalReturns) * 100 * 10) / 10 : 0,
            cc_fault_this_month: parseInt(row.cc_fault_this_month || '0', 10),
            cc_fault_last_month: parseInt(row.cc_fault_last_month || '0', 10),
          };
        }),
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
           SUM(r.initial_returns_number) as total_returns,
           SUM(r.cc_fault) as cc_fault
         FROM returns r
         LEFT JOIN users u ON r.cc_user_id = u.id
         WHERE ${roleFilter.clause}
           AND r.return_date >= CURRENT_DATE - ($${params.length} || ' days')::interval
         GROUP BY r.return_date::date
         ORDER BY date ASC`,
        params
      );

      // Fill in missing dates
      const trends: { date: string; total_returns: number; cc_fault: number }[] = [];
      const dataMap = new Map(result.rows.map(r => {
        const dateVal = r.date as unknown;
        const dateStr = dateVal instanceof Date
          ? dateVal.toISOString().split('T')[0]
          : String(r.date).split('T')[0];
        return [dateStr, {
          total_returns: parseInt(r.total_returns || '0', 10),
          cc_fault: parseInt(r.cc_fault || '0', 10),
        }];
      }));

      for (let i = 0; i < days; i++) {
        const date = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const data = dataMap.get(dateStr);
        trends.push({
          date: dateStr,
          total_returns: data?.total_returns || 0,
          cc_fault: data?.cc_fault || 0,
        });
      }

      return reply.send({ trends });
    }
  );

  // Get returns analytics for a period (week/month/quarter)
  fastify.get(
    '/api/returns/analytics',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const roleFilter = buildRoleWhereClause(request.user, 'r.cc_user_id', 'u');
      const queryParams = request.query as Record<string, string>;
      const period = queryParams.period || 'month'; // week, month, quarter

      // Calculate date range based on period
      let dateCondition: string;
      if (period === 'week') {
        dateCondition = "r.return_date >= CURRENT_DATE - INTERVAL '7 days'";
      } else if (period === 'quarter') {
        dateCondition = "r.return_date >= DATE_TRUNC('quarter', CURRENT_DATE)";
      } else {
        dateCondition = "r.return_date >= DATE_TRUNC('month', CURRENT_DATE)";
      }

      const params = [...roleFilter.params];

      // 1. Summary stats for the period
      const summaryResult = await query(
        `SELECT
           COUNT(DISTINCT r.id) as total_records,
           SUM(r.initial_returns_number) as total_returns,
           SUM(r.cc_fault) as total_cc_fault,
           COUNT(DISTINCT r.cc_user_id) FILTER (WHERE r.cc_fault > 0) as cc_with_faults,
           COUNT(DISTINCT r.block) as blocks_affected
         FROM returns r
         LEFT JOIN users u ON r.cc_user_id = u.id
         WHERE ${roleFilter.clause} AND ${dateCondition}`,
        params
      );

      // 2. By reason (only CC: reasons) - from cc_fault column directly, not from reasons JSONB
      const reasonsResult = await query(
        `SELECT
           reason_data->>'reason' as reason,
           SUM((reason_data->>'count')::int) as total_count,
           COUNT(DISTINCT r.cid) as unique_cids
         FROM returns r
         LEFT JOIN users u ON r.cc_user_id = u.id,
         jsonb_array_elements(r.reasons) as reason_data
         WHERE ${roleFilter.clause}
           AND ${dateCondition}
           AND (reason_data->>'reason') LIKE 'CC:%'
         GROUP BY reason_data->>'reason'
         ORDER BY total_count DESC
         LIMIT 15`,
        params
      );

      // 3. By Team Lead (only active users with faults in this period)
      const teamResult = await query(
        `SELECT
           tl.id as team_lead_id,
           tl.full_name as team_lead_name,
           COUNT(DISTINCT r.cc_user_id) as cc_count,
           SUM(r.initial_returns_number) as total_returns,
           SUM(r.cc_fault) as total_cc_fault,
           COUNT(DISTINCT r.block) as blocks_affected,
           ARRAY_AGG(DISTINCT r.block) FILTER (WHERE r.block IS NOT NULL AND r.block != '') as blocks
         FROM returns r
         INNER JOIN users u ON r.cc_user_id = u.id AND u.is_active = true
         INNER JOIN users tl ON u.team_lead_id = tl.id
         WHERE ${roleFilter.clause}
           AND ${dateCondition}
           AND r.cc_fault > 0
         GROUP BY tl.id, tl.full_name
         HAVING SUM(r.cc_fault) > 0
         ORDER BY total_cc_fault DESC`,
        params
      );

      // 4. By CC (only active users with faults in this period)
      const ccResult = await query(
        `SELECT
           u.id as cc_id,
           u.full_name as cc_name,
           r.cc_abbreviation,
           tl.full_name as team_lead,
           SUM(r.initial_returns_number) as total_returns,
           SUM(r.cc_fault) as total_cc_fault,
           ARRAY_AGG(DISTINCT r.block) FILTER (WHERE r.block IS NOT NULL AND r.block != '') as blocks
         FROM returns r
         INNER JOIN users u ON r.cc_user_id = u.id AND u.is_active = true
         LEFT JOIN users tl ON u.team_lead_id = tl.id
         WHERE ${roleFilter.clause}
           AND ${dateCondition}
           AND r.cc_fault > 0
         GROUP BY u.id, u.full_name, r.cc_abbreviation, tl.full_name
         HAVING SUM(r.cc_fault) > 0
         ORDER BY total_cc_fault DESC
         LIMIT 20`,
        params
      );

      const summary = summaryResult.rows[0] || {};
      const totalReturns = parseInt(summary.total_returns || '0', 10);
      const totalCCFault = parseInt(summary.total_cc_fault || '0', 10);

      return reply.send({
        period,
        summary: {
          total_records: parseInt(summary.total_records || '0', 10),
          total_returns: totalReturns,
          total_cc_fault: totalCCFault,
          cc_fault_percent: totalReturns > 0 ? Math.round((totalCCFault / totalReturns) * 100 * 10) / 10 : 0,
          cc_with_faults: parseInt(summary.cc_with_faults || '0', 10),
          blocks_affected: parseInt(summary.blocks_affected || '0', 10),
        },
        by_reason: reasonsResult.rows.map(row => ({
          reason: row.reason,
          count: parseInt(row.total_count || '0', 10),
          unique_cids: parseInt(row.unique_cids || '0', 10),
        })),
        by_team: teamResult.rows.map(row => {
          const tr = parseInt(row.total_returns || '0', 10);
          const cf = parseInt(row.total_cc_fault || '0', 10);
          return {
            team_lead_id: row.team_lead_id,
            team_lead_name: row.team_lead_name,
            cc_count: parseInt(row.cc_count || '0', 10),
            total_returns: tr,
            total_cc_fault: cf,
            cc_fault_percent: tr > 0 ? Math.round((cf / tr) * 100 * 10) / 10 : 0,
            blocks: row.blocks || [],
          };
        }),
        by_cc: ccResult.rows.map(row => {
          const tr = parseInt(row.total_returns || '0', 10);
          const cf = parseInt(row.total_cc_fault || '0', 10);
          return {
            cc_id: row.cc_id,
            cc_name: row.cc_name,
            cc_abbreviation: row.cc_abbreviation,
            team_lead: row.team_lead,
            total_returns: tr,
            total_cc_fault: cf,
            cc_fault_percent: tr > 0 ? Math.round((cf / tr) * 100 * 10) / 10 : 0,
            blocks: row.blocks || [],
          };
        }),
      });
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
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return reply.status(500).send({
          success: false,
          error: message,
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
