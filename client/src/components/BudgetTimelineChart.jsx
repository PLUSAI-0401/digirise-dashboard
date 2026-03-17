import React from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div style={{
      background: 'white', padding: '12px 16px', border: '1px solid #E5E7EB',
      borderRadius: 8, boxShadow: '0 4px 6px rgba(0,0,0,0.07)', fontSize: 13,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 2, color: p.color }}>
          <span>{p.name}:</span>
          <span style={{ fontWeight: 600 }}>
            {p.name.includes('LINE') ? p.value?.toLocaleString() + '人' : `¥${(p.value / 10000).toFixed(1)}万`}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function BudgetTimelineChart({ timeline, type }) {
  if (!timeline || timeline.length === 0) return null;

  const isLine = type === 'line';
  const title = isLine ? 'LINE登録数 目標推移' : '売上目標推移';
  const dataKey = isLine ? 'lineRegistrations' : 'revenue';
  const barColor = isLine ? '#06B6D4' : '#818CF8';
  const label = isLine ? 'LINE登録目標' : '売上目標';

  const formatYAxis = (v) => {
    if (isLine) return v.toLocaleString();
    return `¥${(v / 10000).toFixed(0)}万`;
  };

  return (
    <div className="chart-card">
      <div className="chart-card-title">{title}</div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: '#6B7280' }}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="square"
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
          <Bar
            dataKey={dataKey}
            name={label}
            fill={barColor}
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
