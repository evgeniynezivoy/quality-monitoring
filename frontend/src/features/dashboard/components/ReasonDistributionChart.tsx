import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { REASON_COLORS } from '@/lib/constants';

interface ReasonData {
  reason: string;
  count: number;
  unique_cids: number;
}

interface ReasonDistributionChartProps {
  data: ReasonData[];
}

export function ReasonDistributionChart({ data }: ReasonDistributionChartProps) {
  if (!data?.length) {
    return (
      <div className="h-[280px] flex items-center justify-center text-gray-400">
        No data available
      </div>
    );
  }

  const chartData = data.map((item, index) => ({
    name: item.reason?.replace('CC: ', '') || 'Unknown',
    value: item.count,
    uniqueCids: item.unique_cids,
    color: REASON_COLORS[index % REASON_COLORS.length],
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) =>
              percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''
            }
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100">
                    <p className="font-medium text-gray-900">{data.name}</p>
                    <div className="mt-1 space-y-1 text-sm">
                      <p className="text-gray-600">
                        Count: <span className="font-semibold text-rose-600">{data.value}</span>
                      </p>
                      <p className="text-gray-600">
                        Unique CIDs: <span className="font-semibold">{data.uniqueCids}</span>
                      </p>
                      <p className="text-gray-500">
                        {((data.value / total) * 100).toFixed(1)}% of total
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            formatter={(value) => (
              <span className="text-xs text-gray-600">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
