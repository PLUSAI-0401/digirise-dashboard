import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCompactCurrency } from '../utils/formatters';

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
          {entry.name}: ¥{entry.value.toLocaleString('ja-JP')}
        </p>
      ))}
    </div>
  );
};

export default function RevenueChart({ revenueHistory }) {
  if (!revenueHistory || revenueHistory.length === 0) return null;

  return (
    <div className="chart-card">
      <div className="chart-card-title">売上推移</div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={revenueHistory}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={formatCompactCurrency} tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Bar
            dataKey="revenue"
            name="月間売上"
            fill="#4F46E5"
            radius={[4, 4, 0, 0]}
            barSize={40}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
