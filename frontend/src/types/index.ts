export interface User {
  id: number;
  email: string;
  full_name: string;
  team: string;
  role: 'admin' | 'team_lead' | 'cc';
  team_lead_id?: number;
  is_active?: boolean;
}

export interface Issue {
  id: number;
  source_id: number;
  source_name: string;
  source_display_name?: string;
  issue_date: string;
  responsible_cc_id: number | null;
  responsible_cc_name: string | null;
  cc_name: string | null;
  cid: string | null;
  issue_type: string;
  comment: string | null;
  issue_rate: 1 | 2 | 3 | null;
  issue_category: 'client' | 'internal' | null;
  reported_by: string | null;
  task_id: string | null;
  raw_data?: Record<string, any>;
  created_at: string;
}

export interface IssueSource {
  id: number;
  name: string;
  display_name: string;
  google_sheet_id: string;
  sheet_gid: string;
  is_active: boolean;
  last_sync_at: string | null;
}

export interface SyncLog {
  id: number;
  source_id: number;
  source_name?: string;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'success' | 'failed';
  rows_fetched: number;
  rows_inserted: number;
  rows_updated: number;
  error_message: string | null;
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

export interface DashboardOverview {
  total_issues: number;
  issues_today: number;
  issues_this_week: number;
  issues_this_month: number;
  critical_issues: number;
}

export interface DashboardTrends {
  trends: Array<{ date: string; count: number }>;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
