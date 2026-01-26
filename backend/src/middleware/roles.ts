import { JwtPayload } from '../types/index.js';

export interface QueryBuilder {
  where(column: string, value: any): QueryBuilder;
  whereIn(column: string, values: any[]): QueryBuilder;
}

export function getDataFilter(user: JwtPayload): {
  column: string | null;
  value: number | number[] | null;
  type: 'exact' | 'in' | 'none';
} {
  switch (user.role) {
    case 'admin':
      // Admin sees everything
      return { column: null, value: null, type: 'none' };

    case 'team_lead':
      // Team lead sees their team members' issues
      return { column: 'team_lead_id', value: user.userId, type: 'exact' };

    case 'cc':
      // CC sees only their own issues
      return { column: 'responsible_cc_id', value: user.userId, type: 'exact' };

    default:
      // Default: see nothing (shouldn't happen)
      return { column: 'id', value: -1, type: 'exact' };
  }
}

export function buildRoleWhereClause(
  user: JwtPayload,
  tableAlias: string = 'i'
): { clause: string; params: any[] } {
  const filter = getDataFilter(user);

  if (filter.type === 'none') {
    return { clause: '1=1', params: [] };
  }

  if (filter.column === 'team_lead_id') {
    // Join with users to filter by team_lead_id
    return {
      clause: `(u.team_lead_id = $1 OR ${tableAlias}.responsible_cc_id = $1)`,
      params: [filter.value],
    };
  }

  return {
    clause: `${tableAlias}.${filter.column} = $1`,
    params: [filter.value],
  };
}

export function canAccessUser(
  requestingUser: JwtPayload,
  targetUserId: number
): boolean {
  if (requestingUser.role === 'admin') {
    return true;
  }

  if (requestingUser.role === 'team_lead') {
    // Team leads can access themselves and their team members
    // (actual team membership check should be done with DB query)
    return true;
  }

  // CC can only access themselves
  return requestingUser.userId === targetUserId;
}
