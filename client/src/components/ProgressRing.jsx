import React from 'react';

export default function ProgressRing({ percentage, size = 100, strokeWidth = 8, color }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(percentage, 0), 100);
  const offset = circumference - (clamped / 100) * circumference;

  const ringColor = color || (clamped >= 80 ? '#10B981' : clamped >= 50 ? '#F59E0B' : '#EF4444');
  const bgColor = color
    ? `${color}20`
    : clamped >= 80 ? '#D1FAE520' : clamped >= 50 ? '#FEF3C720' : '#FEE2E220';

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#E5E7EB"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={ringColor}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}
