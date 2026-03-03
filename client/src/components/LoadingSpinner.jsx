import React from 'react';

export default function LoadingSpinner() {
  return (
    <div className="loading-container">
      <div className="spinner" />
      <p>Stripeからデータを取得中...</p>
    </div>
  );
}
