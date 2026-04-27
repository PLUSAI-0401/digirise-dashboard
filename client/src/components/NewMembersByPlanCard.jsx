import React from 'react';
import { UserPlus } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

const PLAN_LABELS = {
  '1month': '1ヶ月プラン',
  '3month': '3ヶ月プラン',
  '5month': '5ヶ月プラン',
  other: 'その他',
};

const PLAN_COLORS = {
  '1month': '#10B981',
  '3month': '#F59E0B',
  '5month': '#4F46E5',
  other: '#6B7280',
};

/**
 * 月別 新規獲得ユーザー数（プラン別内訳 + 売上）を表示するカード
 */
export default function NewMembersByPlanCard({ newByPlan, activeByPlan, newRevenueByPlan, newTotal, year, month }) {
  if (!newByPlan) return null;

  const planOrder = ['1month', '3month', '5month'];
  const otherCount = newByPlan.other || 0;
  if (otherCount > 0) planOrder.push('other');

  const totalRevenue = planOrder.reduce((s, k) => s + (newRevenueByPlan?.[k] || 0), 0);

  return (
    <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="chart-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <UserPlus size={18} color="#10B981" />
        {year}年{month}月 新規入会（プラン別）
        <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 400, marginLeft: 'auto' }}>
          合計 {newTotal}名 / 新規売上 {formatCurrency(totalRevenue)}（税抜）
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {planOrder.map((key) => {
          const count = newByPlan[key] || 0;
          const activeCount = activeByPlan?.[key] || 0;
          const revenue = newRevenueByPlan?.[key] || 0;
          const ratio = newTotal > 0 ? (count / newTotal) * 100 : 0;
          return (
            <div key={key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{PLAN_LABELS[key]}</span>
                <span style={{ fontSize: 13, color: '#6B7280', textAlign: 'right' }}>
                  <strong style={{ color: '#111827', fontSize: 16 }}>{count}</strong>名
                  <span style={{ fontSize: 12, marginLeft: 8, color: '#374151' }}>
                    売上 <strong>{formatCurrency(revenue)}</strong>
                  </span>
                  <span style={{ fontSize: 11, marginLeft: 8, color: '#9CA3AF' }}>
                    （現アクティブ {activeCount}名）
                  </span>
                </span>
              </div>
              <div style={{ background: '#F3F4F6', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                <div style={{
                  background: PLAN_COLORS[key],
                  height: '100%',
                  width: `${ratio}%`,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        padding: 8,
        background: '#F9FAFB',
        borderRadius: 6,
        fontSize: 11,
        color: '#6B7280',
        borderLeft: '3px solid #E5E7EB',
      }}>
        ※ 売上は新規入会者の初回決済額（税抜・割引後の実績）。広告経由/Organic経由の判別はStripeにソース情報がないため未対応。
      </div>
    </div>
  );
}
