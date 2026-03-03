import React from 'react';
import { Calendar } from 'lucide-react';

export default function DateRangePicker({ year, month, onYearChange, onMonthChange }) {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= currentYear - 3; y--) {
    years.push(y);
  }

  return (
    <div className="date-picker">
      <Calendar size={16} style={{ color: '#6B7280' }} />
      <select value={year} onChange={(e) => onYearChange(parseInt(e.target.value))}>
        {years.map((y) => (
          <option key={y} value={y}>{y}年</option>
        ))}
      </select>
      <select value={month} onChange={(e) => onMonthChange(parseInt(e.target.value))}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <option key={m} value={m}>{m}月</option>
        ))}
      </select>
    </div>
  );
}
