import React from 'react';

const FUNNEL_STEPS = [
  { key: 'impressions', label: 'IMP（広告表示）', format: 'number' },
  { key: 'lpVisits', label: 'LP遷移', format: 'number', rateKey: 'ctr', rateLabel: 'CTR' },
  { key: 'lineRegistrations', label: 'LINE登録', format: 'number', rateKey: 'lineRegRate', rateLabel: '登録率' },
  { key: 'seminarApplies', label: 'セミナー申込', format: 'number', rateKey: 'seminarApplyRate', rateLabel: '申込率' },
  { key: 'conversions', label: 'CV（入会）', format: 'number', rateKey: 'cvr', rateLabel: 'CVR' },
];

const COLORS = ['#4F46E5', '#6366F1', '#818CF8', '#A5B4FC', '#C7D2FE'];

export default function FunnelChart({ funnel }) {
  if (!funnel) return null;

  const maxVal = funnel.impressions || 1;

  return (
    <div className="chart-card">
      <div className="chart-card-title">広告ファネル（月間目標）</div>
      <div className="funnel-container">
        {FUNNEL_STEPS.map((step, i) => {
          const val = funnel[step.key] || 0;
          const width = Math.max((val / maxVal) * 100, 12);
          const rate = step.rateKey ? funnel[step.rateKey] : null;

          return (
            <div key={step.key} className="funnel-step">
              <div className="funnel-label-row">
                <span className="funnel-step-label">{step.label}</span>
                {rate !== null && (
                  <span className="funnel-rate">
                    {step.rateLabel}: {(rate * 100).toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="funnel-bar-wrapper">
                <div
                  className="funnel-bar"
                  style={{
                    width: `${width}%`,
                    backgroundColor: COLORS[i],
                  }}
                >
                  <span className="funnel-bar-value">
                    {val.toLocaleString()}
                  </span>
                </div>
              </div>
              {i < FUNNEL_STEPS.length - 1 && (
                <div className="funnel-arrow">
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                    <path d="M6 10L0 0h12L6 10z" fill="#D1D5DB" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
