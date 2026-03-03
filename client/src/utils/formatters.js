export function formatCurrency(amount) {
  return `¥${amount.toLocaleString('ja-JP')}`;
}

export function formatPercent(value) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}%`;
}

export function formatNumber(value) {
  return value.toLocaleString('ja-JP');
}

export function formatCompactCurrency(amount) {
  if (amount >= 10000) {
    return `¥${(amount / 10000).toFixed(1)}万`;
  }
  return formatCurrency(amount);
}
