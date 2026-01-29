import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TeamData {
  team_lead_id: number;
  team_lead_name: string;
  cc_count: number;
  total_returns: number;
  total_cc_fault: number;
  cc_fault_percent: number;
  blocks: string[];
}

interface TeamDistributionChartProps {
  data: TeamData[];
  onTeamClick?: (teamLeadId: number | null) => void;
  selectedTeamId?: number | null;
}

export function TeamDistributionChart({ data, onTeamClick, selectedTeamId }: TeamDistributionChartProps) {
  if (!data?.length) {
    return (
      <div className="h-[280px] flex items-center justify-center text-gray-400">
        No data available
      </div>
    );
  }

  const sortedData = [...data]
    .sort((a, b) => b.total_cc_fault - a.total_cc_fault)
    .slice(0, 8);

  const chartData = sortedData.map((team) => ({
    id: team.team_lead_id,
    name: team.team_lead_name?.split(' ').slice(0, 2).join(' ') || 'Unknown',
    fullName: team.team_lead_name,
    faults: team.total_cc_fault,
    returns: team.total_returns,
    ccCount: team.cc_count,
    percent: team.cc_fault_percent,
  }));

  const handleBarClick = (data: { id: number }) => {
    if (onTeamClick) {
      onTeamClick(selectedTeamId === data.id ? null : data.id);
    }
  };

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            width={75}
          />
          <Tooltip
            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100">
                    <p className="font-medium text-gray-900">{data.fullName}</p>
                    <div className="mt-1 space-y-1 text-sm">
                      <p className="text-gray-600">
                        CC Faults: <span className="font-semibold text-rose-600">{data.faults}</span>
                      </p>
                      <p className="text-gray-600">
                        Total Returns: <span className="font-semibold">{data.returns}</span>
                      </p>
                      <p className="text-gray-600">
                        CCs: <span className="font-semibold">{data.ccCount}</span>
                      </p>
                      <p className="text-rose-500 font-medium">
                        {data.percent}% fault rate
                      </p>
                    </div>
                    {onTeamClick && (
                      <p className="mt-2 text-xs text-gray-400">Click to filter table</p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar
            dataKey="faults"
            radius={[0, 4, 4, 0]}
            onClick={handleBarClick}
            cursor={onTeamClick ? 'pointer' : 'default'}
          >
            {chartData.map((entry) => (
              <Cell
                key={`cell-${entry.id}`}
                fill={selectedTeamId === entry.id ? '#e11d48' : '#f43f5e'}
                opacity={selectedTeamId && selectedTeamId !== entry.id ? 0.4 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
