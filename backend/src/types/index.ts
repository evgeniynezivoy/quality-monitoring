export interface User {
  id: number;
  email: string;
  full_name: string;
  team_lead_id: number | null;
  team: string;
  role: 'admin' | 'team_lead' | 'cc';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface IssueSource {
  id: number;
  name: string;
  display_name: string;
  google_sheet_id: string;
  sheet_gid: string;
  is_active: boolean;
  last_sync_at: Date | null;
  created_at: Date;
}

export interface Issue {
  id: number;
  source_id: number;
  external_row_hash: string | null;
  issue_date: Date;
  responsible_cc_id: number | null;
  responsible_cc_name: string | null;
  cid: string | null;
  issue_type: string;
  comment: string | null;
  issue_rate: 1 | 2 | 3 | null;
  issue_category: 'client' | 'internal' | null;
  reported_by: string | null;
  task_id: string | null;
  received_datetime: Date | null;
  question_datetime: Date | null;
  answer_datetime: Date | null;
  raw_data: Record<string, any> | null;
  created_at: Date;
}

export interface SyncLog {
  id: number;
  source_id: number | null;
  started_at: Date;
  completed_at: Date | null;
  status: 'running' | 'success' | 'failed';
  rows_fetched: number;
  rows_inserted: number;
  rows_updated: number;
  error_message: string | null;
}

export interface JwtPayload {
  userId: number;
  email: string;
  role: 'admin' | 'team_lead' | 'cc';
  team: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface IssueFilters {
  page?: number;
  limit?: number;
  date_from?: string;
  date_to?: string;
  source?: string;
  team_lead_id?: number;
  responsible_cc_id?: number;
  issue_rate?: number;
  issue_category?: 'client' | 'internal';
  search?: string;
}

export interface DashboardStats {
  total_issues: number;
  issues_by_rate: { rate: number; count: number }[];
  issues_by_category: { category: string; count: number }[];
  issues_by_source: { source: string; count: number }[];
  recent_trend: { date: string; count: number }[];
}
