import React, { useState } from 'react';
import ExportModal from './ExportModal';

const STATUS_LABELS = {
  active: { text: '有効', bg: '#D1FAE5', color: '#065F46' },
  trialing: { text: 'トライアル', bg: '#FEF3C7', color: '#92400E' },
  canceled: { text: '解約済', bg: '#FEE2E2', color: '#991B1B' },
};

function formatDate(isoString) {
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${day} ${h}:${min}`;
}

function formatAmount(amount) {
  return `¥${amount.toLocaleString()}`;
}

export default function MemberListTable({ memberList }) {
  const [expanded, setExpanded] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const DEFAULT_ROWS = 10;

  if (!memberList || memberList.length === 0) {
    return (
      <div className="chart-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
        <p style={{ color: '#6B7280', fontSize: 14 }}>会員データがありません</p>
      </div>
    );
  }

  const displayedMembers = expanded ? memberList : memberList.slice(0, DEFAULT_ROWS);
  const hiddenCount = memberList.length - DEFAULT_ROWS;

  return (
    <div className="chart-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px 12px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="chart-card-title" style={{ marginBottom: 0 }}>
          会員一覧（{memberList.length}名）
        </div>
        <button
          onClick={() => setShowExport(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 8,
            border: '1px solid #D1D5DB', background: '#fff',
            fontSize: 12, fontWeight: 600, color: '#374151',
            cursor: 'pointer', fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Excel
        </button>
      </div>
      {showExport && (
        <ExportModal memberList={memberList} onClose={() => setShowExport(false)} />
      )}
      <div style={{ overflowX: 'auto' }}>
        <table className="member-table">
          <thead>
            <tr>
              <th>メールアドレス</th>
              <th>名前</th>
              <th>金額</th>
              <th>プラン</th>
              <th>入会日時</th>
              <th>ステータス</th>
            </tr>
          </thead>
          <tbody>
            {displayedMembers.map((member, i) => {
              const status = STATUS_LABELS[member.status] || STATUS_LABELS.active;
              return (
                <tr key={i}>
                  <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{member.email || '—'}</td>
                  <td>{member.name || '—'}</td>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatAmount(member.amount)}</td>
                  <td style={{ fontSize: 13 }}>{member.planName}</td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{formatDate(member.createdAt)}</td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 10px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                      background: status.bg,
                      color: status.color,
                    }}>
                      {status.text}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {memberList.length > DEFAULT_ROWS && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: '100%',
            padding: '12px',
            border: 'none',
            borderTop: '1px solid #E5E7EB',
            background: 'transparent',
            cursor: 'pointer',
            color: '#4F46E5',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'inherit',
          }}
        >
          {expanded ? '閉じる' : `他${hiddenCount}名を表示`}
        </button>
      )}
    </div>
  );
}
