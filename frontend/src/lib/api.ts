import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// TODO: Add corporate auth interceptors before release

export default api;

// API functions
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  logout: async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    await api.post('/auth/logout', { refresh_token: refreshToken });
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
  me: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const issuesApi = {
  list: async (params: Record<string, any>) => {
    const response = await api.get('/api/issues', { params });
    return response.data;
  },
  get: async (id: number) => {
    const response = await api.get(`/api/issues/${id}`);
    return response.data;
  },
  stats: async (params?: { date_from?: string; date_to?: string }) => {
    const response = await api.get('/api/issues/stats', { params });
    return response.data;
  },
};

export const dashboardApi = {
  overview: async () => {
    const response = await api.get('/api/dashboard/overview');
    return response.data;
  },
  trends: async (days?: number) => {
    const response = await api.get('/api/dashboard/trends', { params: { days } });
    return response.data;
  },
  byTeam: async () => {
    const response = await api.get('/api/dashboard/by-team');
    return response.data;
  },
  byCC: async (limit?: number) => {
    const response = await api.get('/api/dashboard/by-cc', { params: { limit } });
    return response.data;
  },
  bySource: async () => {
    const response = await api.get('/api/dashboard/by-source');
    return response.data;
  },
  ccAnalytics: async () => {
    const response = await api.get('/api/dashboard/cc-analytics');
    return response.data;
  },
  teamAnalytics: async () => {
    const response = await api.get('/api/dashboard/team-analytics');
    return response.data;
  },
  issueAnalytics: async () => {
    const response = await api.get('/api/dashboard/issue-analytics');
    return response.data;
  },
};

export const usersApi = {
  list: async (params?: Record<string, any>) => {
    const response = await api.get('/api/users', { params });
    return response.data;
  },
  dropdown: async () => {
    const response = await api.get('/api/users/dropdown');
    return response.data;
  },
  teamLeads: async () => {
    const response = await api.get('/api/users/team-leads');
    return response.data;
  },
};

export const syncApi = {
  status: async () => {
    const response = await api.get('/api/sync/status');
    return response.data;
  },
  trigger: async () => {
    const response = await api.post('/api/sync/trigger');
    return response.data;
  },
  logs: async (limit?: number) => {
    const response = await api.get('/api/sync/logs', { params: { limit } });
    return response.data;
  },
  teamStructure: async () => {
    const response = await api.get('/api/sync/team');
    return response.data;
  },
  syncTeam: async () => {
    const response = await api.post('/api/sync/team');
    return response.data;
  },
};

export const adminApi = {
  users: async () => {
    const response = await api.get('/api/admin/users');
    return response.data;
  },
  createUser: async (data: any) => {
    const response = await api.post('/api/admin/users', data);
    return response.data;
  },
  updateUser: async (id: number, data: any) => {
    const response = await api.put(`/api/admin/users/${id}`, data);
    return response.data;
  },
  sources: async () => {
    const response = await api.get('/api/admin/sources');
    return response.data;
  },
  stats: async () => {
    const response = await api.get('/api/admin/stats');
    return response.data;
  },
};

export const returnsApi = {
  list: async (params?: Record<string, any>) => {
    const response = await api.get('/api/returns', { params });
    return response.data;
  },
  overview: async () => {
    const response = await api.get('/api/returns/overview');
    return response.data;
  },
  byCC: async (limit?: number) => {
    const response = await api.get('/api/returns/by-cc', { params: { limit } });
    return response.data;
  },
  byReason: async () => {
    const response = await api.get('/api/returns/by-reason');
    return response.data;
  },
  trends: async (days?: number) => {
    const response = await api.get('/api/returns/trends', { params: { days } });
    return response.data;
  },
  sync: async () => {
    const response = await api.post('/api/returns/sync');
    return response.data;
  },
  syncLogs: async (limit?: number) => {
    const response = await api.get('/api/returns/sync/logs', { params: { limit } });
    return response.data;
  },
};

export const reportsApi = {
  getDailyReport: async (date?: string) => {
    const response = await api.get('/api/reports/daily', { params: { date } });
    return response.data;
  },
  previewReport: async (date?: string) => {
    const response = await api.get('/api/reports/daily/preview', { params: { date } });
    return response.data;
  },
  sendReport: async (recipients?: string[], date?: string) => {
    const response = await api.post('/api/reports/daily/send', { recipients, date });
    return response.data;
  },
  sendAllReports: async (date?: string) => {
    const response = await api.post('/api/reports/send-all', { date });
    return response.data;
  },
  testConnection: async () => {
    const response = await api.get('/api/reports/test-connection');
    return response.data;
  },
  testSend: async (email: string) => {
    const response = await api.post('/api/reports/test-send', { email });
    return response.data;
  },
  getRecipients: async () => {
    const response = await api.get('/api/reports/recipients');
    return response.data;
  },
  getEmailLogs: async (limit?: number) => {
    const response = await api.get('/api/reports/email-logs', { params: { limit } });
    return response.data;
  },
  cleanupEmailLogs: async () => {
    const response = await api.post('/api/reports/email-logs/cleanup');
    return response.data;
  },
};
