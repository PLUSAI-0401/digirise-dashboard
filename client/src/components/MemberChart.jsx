import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
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
          {entry.name}: {entry.value}{entry.name === '累計会員数' ? '名' : '名'}
        </p>
      ))}
    </div>
  );
};

export default function MemberChart({ memberHistory, weeklyMembers }) {
  const [tab, setTab] = useState('weekly');

  const hasMonthly = memberHistory && memberHistory.length > 0;
  const hasWeekly = weeklyMembers && weeklyMembers.length > 0;

  if (!hasMonthly && !hasWeekly) return null;

  return (
    <div className="chart-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="chart-card-title" style={{ marginBottom: 0 }}>会員推移</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {hasWeekly && (
            <button
              onClick={() => setTab('weekly')}
              style={{
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: tab === 'weekly' ? 600 : 400,
                border: '1px solid #E5E7EB',
                borderRadius: 6,
                background: tab === 'weekly' ? '#4F46E5' : '#fff',
                color: tab === 'weekly' ? '#fff' : '#6B7280',
                cursor: 'pointer',
              }}
            >
              週次
            </button>
          )}
          {hasMonthly && (
            <button
              onClick={() => setTab('monthly')}
              style={{
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: tab === 'monthly' ? 600 : 400,
                border: '1px solid #E5E7EB',
                borderRadius: 6,
                background: tab === 'monthly' ? '#4F46E5' : '#fff',
                color: tab === 'monthly' ? '#fff' : '#6B7280',
                cursor: 'pointer',
              }}
            >
              月次
            </button>
          )}
        </div>
      </div>

      {tab === 'weekly' && hasWeekly && (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={weeklyMembers}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} allowDecimals={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Bar
              yAxisId="left"
              dataKey="newMembers"
              name="新規入会"
              fill="#10B981"
              radius={[4, 4, 0, 0]}
              barSize={24}
            />
            <Bar
              yAxisId="left"
              dataKey="churned"
              name="解約"
              fill="#EF4444"
              radius={[4, 4, 0, 0]}
              barSize={24}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="total"
              name="累計会員数"
              stroke="#4F46E5"
              strokeWidth={2}
              dot={{ fill: '#4F46E5', r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {tab === 'monthly' && hasMonthly && (
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
      )}
    </div>
  );
}
