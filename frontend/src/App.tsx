import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { IssuesPage } from '@/features/issues/IssuesPage';
import { MyIssuesPage } from '@/features/issues/MyIssuesPage';
import { TeamPage } from '@/features/team/TeamPage';
import { AdminPage } from '@/features/admin/AdminPage';
import { SyncPage } from '@/features/admin/SyncPage';

// TODO: Add corporate auth module before release
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="issues" element={<IssuesPage />} />
        <Route path="my-issues" element={<MyIssuesPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="sync" element={<SyncPage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
