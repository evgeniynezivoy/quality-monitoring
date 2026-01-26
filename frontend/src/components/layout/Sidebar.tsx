import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  AlertCircle,
  Users,
  Settings,
  RefreshCw,
  User,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'team_lead', 'cc'] },
  { name: 'Issues', href: '/issues', icon: AlertCircle, roles: ['admin', 'team_lead', 'cc'] },
  { name: 'My Issues', href: '/my-issues', icon: User, roles: ['cc'] },
  { name: 'Team', href: '/team', icon: Users, roles: ['admin', 'team_lead'] },
  { name: 'Sync Status', href: '/sync', icon: RefreshCw, roles: ['admin'] },
  { name: 'Admin', href: '/admin', icon: Settings, roles: ['admin'] },
];

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();

  const filteredNavigation = navigation.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">Quality Monitor</h1>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-4">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'group flex items-center rounded-md px-2 py-2 text-sm font-medium',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
      {user && (
        <div className="border-t border-gray-800 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-white">
                {user.full_name.charAt(0)}
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">{user.full_name}</p>
              <p className="text-xs text-gray-400">{user.role}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
