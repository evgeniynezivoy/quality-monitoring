import { query } from '../config/database.js';
import { Issue, IssueFilters, PaginatedResponse, JwtPayload } from '../types/index.js';
import { buildRoleWhereClause } from '../middleware/roles.js';

export async function getIssues(
  filters: IssueFilters,
  user: JwtPayload
): Promise<PaginatedResponse<Issue & { source_name: string; cc_name: string }>> {
  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 20, 100);
  const offset = (page - 1) * limit;

  const roleFilter = buildRoleWhereClause(user);
  const whereClauses: string[] = [roleFilter.clause];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any[] = [...roleFilter.params];
  let paramIndex = params.length + 1;

  if (filters.date_from) {
    whereClauses.push(`i.issue_date >= $${paramIndex++}`);
    params.push(filters.date_from);
  }

  if (filters.date_to) {
    whereClauses.push(`i.issue_date <= $${paramIndex++}`);
    params.push(filters.date_to);
  }

  if (filters.source) {
    whereClauses.push(`s.name = $${paramIndex++}`);
    params.push(filters.source);
  }

  if (filters.responsible_cc_id) {
    whereClauses.push(`i.responsible_cc_id = $${paramIndex++}`);
    params.push(filters.responsible_cc_id);
  }

  if (filters.team_lead_id) {
    whereClauses.push(`u.team_lead_id = $${paramIndex++}`);
    params.push(filters.team_lead_id);
  }

  if (filters.issue_rate) {
    whereClauses.push(`i.issue_rate = $${paramIndex++}`);
    params.push(filters.issue_rate);
  }

  if (filters.issue_category) {
    whereClauses.push(`i.issue_category = $${paramIndex++}`);
    params.push(filters.issue_category);
  }

  if (filters.search) {
    whereClauses.push(`(
      i.responsible_cc_name ILIKE $${paramIndex} OR
      i.cid ILIKE $${paramIndex} OR
      i.issue_type ILIKE $${paramIndex} OR
      i.comment ILIKE $${paramIndex}
    )`);
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  const whereClause = whereClauses.join(' AND ');

  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM issues i
     LEFT JOIN issue_sources s ON i.source_id = s.id
     LEFT JOIN users u ON i.responsible_cc_id = u.id
     WHERE ${whereClause}`,
    params
  );

  const total = parseInt(countResult.rows[0]?.count || '0', 10);

  // Get data
  const dataParams = [...params, limit, offset];
  const dataResult = await query<Issue & { source_name: string; cc_name: string }>(
    `SELECT
       i.*,
       s.name as source_name,
       s.display_name as source_display_name,
       COALESCE(u.full_name, i.responsible_cc_name) as cc_name
     FROM issues i
     LEFT JOIN issue_sources s ON i.source_id = s.id
     LEFT JOIN users u ON i.responsible_cc_id = u.id
     WHERE ${whereClause}
     ORDER BY i.issue_date DESC, i.id DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    dataParams
  );

  return {
    data: dataResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getIssueById(id: number): Promise<Issue | null> {
  const result = await query<Issue>(
    `SELECT i.*, s.name as source_name, s.display_name as source_display_name
     FROM issues i
     LEFT JOIN issue_sources s ON i.source_id = s.id
     WHERE i.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function getIssueStats(
  user: JwtPayload,
  dateFrom?: string,
  dateTo?: string
): Promise<{
  total: number;
  by_rate: { rate: number; count: number }[];
  by_category: { category: string; count: number }[];
  by_source: { source: string; count: number }[];
}> {
  const roleFilter = buildRoleWhereClause(user);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any[] = [...roleFilter.params];
  let paramIndex = params.length + 1;

  let dateFilter = '';
  if (dateFrom) {
    dateFilter += ` AND i.issue_date >= $${paramIndex++}`;
    params.push(dateFrom);
  }
  if (dateTo) {
    dateFilter += ` AND i.issue_date <= $${paramIndex++}`;
    params.push(dateTo);
  }

  const baseWhere = `${roleFilter.clause}${dateFilter}`;

  const [totalResult, rateResult, categoryResult, sourceResult] = await Promise.all([
    query<{ count: string }>(
      `SELECT COUNT(*) as count FROM issues i
       LEFT JOIN users u ON i.responsible_cc_id = u.id
       WHERE ${baseWhere}`,
      params
    ),
    query<{ rate: number; count: string }>(
      `SELECT issue_rate as rate, COUNT(*) as count FROM issues i
       LEFT JOIN users u ON i.responsible_cc_id = u.id
       WHERE ${baseWhere} AND issue_rate IS NOT NULL
       GROUP BY issue_rate ORDER BY issue_rate`,
      params
    ),
    query<{ category: string; count: string }>(
      `SELECT issue_category as category, COUNT(*) as count FROM issues i
       LEFT JOIN users u ON i.responsible_cc_id = u.id
       WHERE ${baseWhere} AND issue_category IS NOT NULL
       GROUP BY issue_category`,
      params
    ),
    query<{ source: string; count: string }>(
      `SELECT s.name as source, COUNT(*) as count FROM issues i
       LEFT JOIN issue_sources s ON i.source_id = s.id
       LEFT JOIN users u ON i.responsible_cc_id = u.id
       WHERE ${baseWhere}
       GROUP BY s.name ORDER BY count DESC`,
      params
    ),
  ]);

  return {
    total: parseInt(totalResult.rows[0]?.count || '0', 10),
    by_rate: rateResult.rows.map((r) => ({ rate: r.rate, count: parseInt(r.count, 10) })),
    by_category: categoryResult.rows.map((r) => ({ category: r.category, count: parseInt(r.count, 10) })),
    by_source: sourceResult.rows.map((r) => ({ source: r.source, count: parseInt(r.count, 10) })),
  };
}
