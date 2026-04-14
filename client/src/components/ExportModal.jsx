import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

const STATUS_LABELS = {
  active: '有効',
  trialing: 'トライアル',
  canceled: '解約済',
};

const PERIOD_OPTIONS = [
  { value: '1m', label: '直近1ヶ月' },
  { value: '3m', label: '直近3ヶ月' },
  { value: '6m', label: '直近半年' },
  { value: '1y', label: '直近1年' },
  { value: 'all', label: '全期間' },
];

function getDateThreshold(periodValue) {
  if (periodValue === 'all') return null;
  const now = new Date();
  switch (periodValue) {
    case '1m': now.setMonth(now.getMonth() - 1); break;
    case '3m': now.setMonth(now.getMonth() - 3); break;
    case '6m': now.setMonth(now.getMonth() - 6); break;
    case '1y': now.setFullYear(now.getFullYear() - 1); break;
  }
  return now;
}

function formatDateForExcel(isoString) {
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${day} ${h}:${min}`;
}

export default function ExportModal({ memberList, onClose }) {
  const [period, setPeriod] = useState('all');
  const [selectedPlan, setSelectedPlan] = useState('all');
  const [showSuccess, setShowSuccess] = useState(false);

  const planOptions = useMemo(() => {
    if (!memberList) return [];
    const plans = [...new Set(memberList.map(m => m.planName))];
    plans.sort();
    return plans;
  }, [memberList]);

  const filteredMembers = useMemo(() => {
    if (!memberList) return [];
    let filtered = [...memberList];

    // Period filter
    const threshold = getDateThreshold(period);
    if (threshold) {
      filtered = filtered.filter(m => new Date(m.createdAt) >= threshold);
    }

    // Plan filter
    if (selectedPlan !== 'all') {
      filtered = filtered.filter(m => m.planName === selectedPlan);
    }

    return filtered;
  }, [memberList, period, selectedPlan]);

  const handleDownload = () => {
    const rows = filteredMembers.map(m => ({
      '顧客ID': m.customerId || '',
      '支払いID': m.chargeId || '',
      'メールアドレス': m.email || '',
      '名前': m.name || '',
      '決済金額': m.amount,
      '返金額': m.refundAmount || 0,
      '返金理由': m.refundReason || '',
      'クーポン名': m.couponName || '',
      '割引額': m.couponAmount || 0,
      'プラン': m.planName,
      '決済日時': m.paymentDate ? formatDateForExcel(m.paymentDate) : '',
      'Stripe手数料': m.stripeFee || 0,
      '手数料消費税': m.stripeFeeTax || 0,
      '入会日時': formatDateForExcel(m.createdAt),
      'ステータス': STATUS_LABELS[m.status] || m.status,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    ws['!cols'] = [
      { wch: 22 }, // 顧客ID
      { wch: 30 }, // 支払いID
      { wch: 30 }, // メールアドレス
      { wch: 15 }, // 名前
      { wch: 12 }, // 決済金額
      { wch: 10 }, // 返金額
      { wch: 16 }, // 返金理由
      { wch: 18 }, // クーポン名
      { wch: 10 }, // 割引額
      { wch: 18 }, // プラン
      { wch: 18 }, // 決済日時
      { wch: 14 }, // Stripe手数料
      { wch: 14 }, // 手数料消費税
      { wch: 18 }, // 入会日時
      { wch: 10 }, // ステータス
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '会員一覧');

    const periodLabel = PERIOD_OPTIONS.find(p => p.value === period)?.label || '';
    const planLabel = selectedPlan === 'all' ? '全プラン' : selectedPlan;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fileName = `会員一覧_${periodLabel}_${planLabel}_${today}.xlsx`;

    XLSX.writeFile(wb, fileName);

    setShowSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: 12, padding: '28px 32px',
          width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          position: 'relative', overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {showSuccess && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            background: '#fff', borderRadius: 12,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>
              ダウンロード完了
            </p>
          </div>
        )}
        <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#111827' }}>
          会員データのダウンロード
        </h3>

        {/* Period selection */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            期間
          </label>
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              border: '1px solid #D1D5DB', fontSize: 14, background: '#fff',
              color: '#111827', outline: 'none',
            }}
          >
            {PERIOD_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Plan selection */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            プラン
          </label>
          <select
            value={selectedPlan}
            onChange={e => setSelectedPlan(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              border: '1px solid #D1D5DB', fontSize: 14, background: '#fff',
              color: '#111827', outline: 'none',
            }}
          >
            <option value="all">全プラン</option>
            {planOptions.map(plan => (
              <option key={plan} value={plan}>{plan}</option>
            ))}
          </select>
        </div>

        {/* Preview count */}
        <div style={{
          padding: '10px 14px', borderRadius: 8, background: '#F3F4F6',
          fontSize: 13, color: '#4B5563', marginBottom: 20,
        }}>
          対象: <strong style={{ color: '#111827' }}>{filteredMembers.length}名</strong>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '10px', borderRadius: 8,
              border: '1px solid #D1D5DB', background: '#fff',
              fontSize: 14, fontWeight: 600, color: '#374151',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleDownload}
            disabled={filteredMembers.length === 0}
            style={{
              flex: 1, padding: '10px', borderRadius: 8,
              border: 'none', background: filteredMembers.length > 0 ? '#4F46E5' : '#9CA3AF',
              fontSize: 14, fontWeight: 600, color: '#fff',
              cursor: filteredMembers.length > 0 ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
            }}
          >
            ダウンロード
          </button>
        </div>
      </div>
    </div>
  );
}
