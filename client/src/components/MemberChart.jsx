import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #E5E7EB',
      borderRadius: 8,
      padding: '12px 16px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
    }}>
      <p style={{ fontWeight: 600, marginBottom: 8 }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color, fontSize: 13 }}>
          {entry.name}: {entry.value}名
        </p>
      ))}
    </div>
  );
};

export default function MemberChart({ memberHistory }) {
  if (!memberHistory || memberHistory.length === 0) return null;

  return (
    <div className="chart-card">
      <div className="chart-card-title">会員推移（新規・解約）</div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={memberHistory}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Bar
            dataKey="newMembers"
            name="新規入会"
            fill="#10B981"
            radius={[4, 4, 0, 0]}
            barSize={30}
          />
          <Bar
            dataKey="churned"
            name="解約"
            fill="#EF4444"
            radius={[4, 4, 0, 0]}
            barSize={30}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
