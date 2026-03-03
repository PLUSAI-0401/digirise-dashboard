import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #E5E7EB',
      borderRadius: 8,
      padding: '12px 16px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
    }}>
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{data.planName}</p>
      <p style={{ fontSize: 13 }}>月間売上: ¥{data.monthlyRevenue.toLocaleString('ja-JP')}</p>
      <p style={{ fontSize: 13 }}>会員数: {data.activeSubscribers}名</p>
      <p style={{ fontSize: 13 }}>シェア: {data.percentageOfTotal}%</p>
    </div>
  );
};

export default function PlanPieChart({ plans }) {
  if (!plans || plans.length === 0) return null;

  return (
    <div className="chart-card">
      <div className="chart-card-title">プラン別売上シェア</div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={plans}
            dataKey="monthlyRevenue"
            nameKey="planName"
            cx="50%"
            cy="50%"
            outerRadius={100}
            innerRadius={50}
            paddingAngle={2}
            label={({ planName, percentageOfTotal }) =>
              `${percentageOfTotal}%`
            }
            labelLine={true}
          >
            {plans.map((entry, index) => (
              <Cell key={entry.planId} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => <span style={{ fontSize: 12 }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
