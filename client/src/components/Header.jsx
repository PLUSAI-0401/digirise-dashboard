import React from 'react';
import { RefreshCw, FileDown } from 'lucide-react';

export default function Header({ onRefresh, loading }) {
  const handleExportActuals = () => {
    // 実績CSVをダウンロード（スプシ貼り付け用）
    window.open('/api/dashboard/actuals/export?format=csv', '_blank');
  };

  return (
    <header className="header">
      <div className="header-left">
        <div className="header-logo">D</div>
        <div>
          <div className="header-title">デジライズAIスクール</div>
          <div className="header-subtitle">売上管理ダッシュボード</div>
        </div>
      </div>
      <div className="header-right" style={{ display: 'flex', gap: 8 }}>
        <button
          className="refresh-btn"
          onClick={handleExportActuals}
          title="月別の実績データをCSVで出力（スプシの実績欄に貼り付け用）"
          style={{ background: '#fff', border: '1px solid #E5E7EB' }}
        >
          <FileDown size={14} />
          実績CSV出力
        </button>
        <button className="refresh-btn" onClick={onRefresh} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          データ更新
        </button>
      </div>
    </header>
  );
}
