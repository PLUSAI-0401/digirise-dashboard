import React, { useState, useRef, useEffect } from 'react';
import ProgressRing from './ProgressRing';
import { formatCurrency, formatNumber } from '../utils/formatters';

function EditableValue({ value, unit, onSave }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef(null);
  const isCurrency = unit === 'currency';

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleClick = () => {
    setEditValue(String(value));
    setEditing(true);
  };

  const handleConfirm = () => {
    const num = Number(editValue.replace(/[^0-9.-]/g, ''));
    if (!isNaN(num)) {
      onSave(num);
    }
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        className="budget-kpi-edit-input"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleConfirm}
        onKeyDown={handleKeyDown}
      />
    );
  }

  const formatted = isCurrency ? formatCurrency(value) : formatNumber(value);
  return (
    <span className="budget-kpi-editable" onClick={handleClick} title="クリックで編集">
      {formatted}
    </span>
  );
}

export default function BudgetKPICard({ title, budget, actual, unit, icon, description, editable, onSave }) {
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
            <span className="budget-kpi-row-value">
              {editable && onSave ? (
                <EditableValue value={budget} unit={unit} onSave={(v) => onSave('budget', v)} />
              ) : (
                formatValue(budget)
              )}
            </span>
          </div>
          <div className="budget-kpi-row">
            <span className="budget-kpi-row-label">実績</span>
            <span className="budget-kpi-row-value budget-kpi-actual">
              {editable && onSave ? (
                <EditableValue value={actual} unit={unit} onSave={(v) => onSave('actual', v)} />
              ) : (
                formatValue(actual)
              )}
            </span>
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
