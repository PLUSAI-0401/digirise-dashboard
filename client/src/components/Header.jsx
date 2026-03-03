import React from 'react';
import { RefreshCw } from 'lucide-react';

export default function Header({ onRefresh, loading }) {
  return (
    <header className="header">
      <div className="header-left">
        <div className="header-logo">D</div>
        <div>
          <div className="header-title">デジライズAIスクール</div>
          <div className="header-subtitle">売上管理ダッシュボード</div>
        </div>
      </div>
      <div className="header-right">
        <button className="refresh-btn" onClick={onRefresh} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          データ更新
        </button>
      </div>
    </header>
  );
}
