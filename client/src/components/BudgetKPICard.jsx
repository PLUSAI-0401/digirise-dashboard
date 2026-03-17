import React from 'react';
import ProgressRing from './ProgressRing';
import { formatCurrency, formatNumber } from '../utils/formatters';

export default function BudgetKPICard({ title, budget, actual, unit, icon, description }) {
  const percentage = budget > 0 ? Math.round((actual / budget) * 100) : 0;
  const diff = actual - budget;
  const isCurrency = unit === 'currency';

  const formatValue = (v) => isCurrency ? formatCurrency(v) : formatNumber(v);

  return (
    <div className="budget-kpi-card">
      <div className="budget-kpi-header">
        <div>
          <div className="budget-kpi-title">{title}</div>
          {description && <div className="budget-kpi-desc">{description}</div>}
        </div>
        {icon && <div className="budget-kpi-icon">{icon}</div>}
      </div>

      <div className="budget-kpi-body">
        <div className="budget-kpi-ring-wrapper">
          <ProgressRing percentage={percentage} size={88} strokeWidth={7} />
          <div className="budget-kpi-ring-label">
            <span className="budget-kpi-pct">{percentage}%</span>
            <span className="budget-kpi-pct-sub">達成</span>
          </div>
        </div>

        <div className="budget-kpi-details">
          <div className="budget-kpi-row">
            <span className="budget-kpi-row-label">目標</span>
            <span className="budget-kpi-row-value">{formatValue(budget)}</span>
          </div>
          <div className="budget-kpi-row">
            <span className="budget-kpi-row-label">実績</span>
            <span className="budget-kpi-row-value budget-kpi-actual">{formatValue(actual)}</span>
          </div>
          <div className="budget-kpi-row">
            <span className="budget-kpi-row-label">差分</span>
            <span className={`budget-kpi-row-value ${diff >= 0 ? 'positive' : 'negative'}`}>
              {diff >= 0 ? '+' : ''}{formatValue(diff)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
