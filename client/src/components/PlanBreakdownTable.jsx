import React from 'react';
import { formatCurrency } from '../utils/formatters';

export default function PlanBreakdownTable({ plans, totalMonthlyRevenue }) {
  if (!plans || plans.length === 0) return null;

  const totalSubscribers = plans.reduce((s, p) => s + p.activeSubscribers, 0);

  return (
    <div className="chart-card">
      <div className="chart-card-title">プラン別詳細 <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 400 }}>(税抜・割引後実績)</span></div>
      <table className="plan-table">
        <thead>
          <tr>
            <th>プラン名</th>
            <th>単価 (税抜)</th>
            <th>会員数</th>
            <th>月間売上 (税抜)</th>
            <th>シェア</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <tr key={plan.planId}>
              <td>{plan.planName}</td>
              <td>{formatCurrency(plan.unitAmount)}</td>
              <td>{plan.activeSubscribers}名</td>
              <td style={{ fontWeight: 600 }}>{formatCurrency(plan.monthlyRevenue)}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="plan-share-bar" style={{ width: 80 }}>
                    <div
                      className="plan-share-fill"
                      style={{ width: `${plan.percentageOfTotal}%` }}
                    />
                  </div>
                  <span style={{ fontSize: 13 }}>{plan.percentageOfTotal}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>合計</td>
            <td>—</td>
            <td>{totalSubscribers}名</td>
            <td>{formatCurrency(totalMonthlyRevenue)}</td>
            <td>100%</td>
          </tr>
        </tfoot>
      </table>
      <div style={{
        marginTop: 12,
        padding: 8,
        background: '#F9FAFB',
        borderRadius: 6,
        fontSize: 11,
        color: '#6B7280',
        borderLeft: '3px solid #E5E7EB',
      }}>
        ※ ARPU（1人あたり平均売上）は、5ヶ月プラン会員のライフサイクル完了後（2026年8月以降）に正確な実績値で算出予定。
      </div>
    </div>
  );
}
