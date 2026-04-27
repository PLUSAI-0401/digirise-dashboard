import React from 'react';
import { formatCurrency } from '../utils/formatters';

export default function PlanBreakdownTable({ plans, totalMonthlyRevenue, overallArpu }) {
  if (!plans || plans.length === 0) return null;

  const totalSubscribers = plans.reduce((s, p) => s + p.activeSubscribers, 0);
  const totalArpu = overallArpu ?? (totalSubscribers > 0 ? Math.round(totalMonthlyRevenue / totalSubscribers) : 0);

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
            <th>ARPU (税抜)</th>
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
              <td>{formatCurrency(plan.arpu ?? 0)}</td>
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
            <td style={{ fontWeight: 600 }}>{formatCurrency(totalArpu)}</td>
            <td>100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
