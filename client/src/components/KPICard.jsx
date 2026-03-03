import React from 'react';

export default function KPICard({ title, value, subtitle, trend, trendDirection, icon: Icon, iconColor = 'primary' }) {
  return (
    <div className="kpi-card">
      <div className="kpi-card-header">
        <span className="kpi-card-title">{title}</span>
        {Icon && (
          <div className={`kpi-card-icon ${iconColor}`}>
            <Icon size={18} />
          </div>
        )}
      </div>
      <div className="kpi-card-value">{value}</div>
      <div className="kpi-card-subtitle">
        {trend !== undefined && trend !== null && (
          <span className={`kpi-trend ${trendDirection || (trend >= 0 ? 'up' : 'down')}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
        {subtitle && <span> {subtitle}</span>}
      </div>
    </div>
  );
}
