import React from 'react';

export default function ErrorMessage({ message }) {
  return (
    <div className="error-container">
      <p>エラーが発生しました</p>
      <p style={{ fontSize: 13, marginTop: 8, opacity: 0.8 }}>{message}</p>
      <p style={{ fontSize: 12, marginTop: 8, color: '#6B7280' }}>
        .envファイルにStripeのAPIキーが正しく設定されているか確認してください。
      </p>
    </div>
  );
}
