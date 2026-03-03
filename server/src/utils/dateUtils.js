// データ起点: 2026年2月27日 20:00 JST (UTC+9)
const DATA_CUTOFF = new Date('2026-02-27T20:00:00+09:00');
const CUTOFF_TIMESTAMP = Math.floor(DATA_CUTOFF.getTime() / 1000);

function getMonthRange(year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  // カットオフ以前の開始日はカットオフに置き換え
  const startTs = Math.max(
    Math.floor(start.getTime() / 1000),
    CUTOFF_TIMESTAMP
  );

  return {
    startTimestamp: startTs,
    endTimestamp: Math.floor(end.getTime() / 1000),
  };
}

function getPreviousMonth(year, month) {
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
}

function getMonthLabel(year, month) {
  return `${year}年${month}月`;
}

module.exports = { getMonthRange, getPreviousMonth, getMonthLabel, CUTOFF_TIMESTAMP };
