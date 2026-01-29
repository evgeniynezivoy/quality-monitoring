interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

export function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className={`px-2 py-0.5 text-xs rounded-full ${
          active ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}
