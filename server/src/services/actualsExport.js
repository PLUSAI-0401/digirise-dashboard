// 実績データを月別×KPIで構造化する。
// CSV出力 / Google Sheets書き込みの共通データソースとして使う。

const { getMonthRange } = require('../utils/dateUtils');
const stripe = require('../config/stripe');
const { isPermanentlyFree, getPlanKey } = require('../utils/subscriptionFilters');

const TAX_DIVISOR = 1.1;
const DAYS_PER_MONTH = 365.25 / 12;

function emptyPlanCounts() {
  return { '1month': 0, '3month': 0, '5month': 0 };
}

/**
 * 1ヶ月分の実績KPIを集計する
 * - 新規獲得ユーザー数（合計 + プラン別）
 * - 売上高合計はchargeベース（Dashboardと一致）、プラン別はinvoice比率で配分
 * - 税抜表示
 */
async function getMonthActuals(year, month) {
  const { startTimestamp, endTimestamp } = getMonthRange(year, month);

  // 新規入会（プラン別、永続無料除外）
  const newByPlan = emptyPlanCounts();
  let newTotal = 0;
  for await (const sub of stripe.subscriptions.list({
    created: { gte: startTimestamp, lte: endTimestamp },
    limit: 100,
    expand: ['data.discount.coupon', 'data.customer', 'data.items.data.price'],
  })) {
    if (isPermanentlyFree(sub)) continue;
    newTotal++;
    const k = getPlanKey(sub);
    if (newByPlan[k] !== undefined) newByPlan[k]++;
  }

  // 売上合計（chargeベース、返金控除済、Dashboardのcurrentmonth.revenueと一致）
  let totalChargeIncTax = 0;
  let txCount = 0;
  for await (const ch of stripe.charges.list({
    created: { gte: startTimestamp, lte: endTimestamp },
    limit: 100,
  })) {
    if (ch.status === 'succeeded' && !ch.refunded) {
      totalChargeIncTax += ch.amount - (ch.amount_refunded || 0);
      txCount++;
    }
  }
  const revTotal = Math.round(totalChargeIncTax / TAX_DIVISOR);

  // プラン別売上比率を invoice から算出
  const invByPlan = { '1month': 0, '3month': 0, '5month': 0 };
  for await (const invoice of stripe.invoices.list({
    created: { gte: startTimestamp, lte: endTimestamp },
    status: 'paid',
    limit: 100,
    expand: ['data.lines.data.price'],
  })) {
    if (invoice.amount_paid <= 0) continue;
    if (!invoice.subscription) continue;
    const taxExcl = invoice.total_excluding_tax ?? Math.round(invoice.amount_paid / TAX_DIVISOR);

    const lineItem = invoice.lines?.data?.[0];
    const price = lineItem?.price;
    if (price?.recurring) {
      const ic = price.recurring.interval_count || 1;
      let k = 'other';
      if (price.recurring.interval === 'month') {
        if (ic === 1) k = '1month';
        else if (ic === 3) k = '3month';
        else if (ic === 5) k = '5month';
      } else if (price.recurring.interval === 'day') {
        if (ic >= 28 && ic <= 31) k = '1month';
        else if (ic >= 89 && ic <= 92) k = '3month';
        else if (ic >= 148 && ic <= 152) k = '5month';
      }
      if (invByPlan[k] !== undefined) invByPlan[k] += taxExcl;
    }
  }

  // プラン別比率に基づいてrevTotalを配分（合計をDashboardと一致させるため）
  const invSum = invByPlan['1month'] + invByPlan['3month'] + invByPlan['5month'];
  const revByPlan = { '1month': 0, '3month': 0, '5month': 0 };
  if (invSum > 0) {
    revByPlan['1month'] = Math.round(revTotal * (invByPlan['1month'] / invSum));
    revByPlan['3month'] = Math.round(revTotal * (invByPlan['3month'] / invSum));
    // 5ヶ月は端数調整で残額を割り当て
    revByPlan['5month'] = revTotal - revByPlan['1month'] - revByPlan['3month'];
  }

  return {
    year,
    month,
    newUsers: { total: newTotal, ...newByPlan },
    revenue: { total: revTotal, ...revByPlan },
    transactionCount: txCount,
  };
}

/**
 * 複数月の実績を返す
 */
async function getActualsRange(months) {
  const results = [];
  for (const { year, month } of months) {
    results.push(await getMonthActuals(year, month));
  }
  return results;
}

/**
 * 実績データをCSV形式で出力（スプシ貼り付け用）
 * 各行は1つのKPI、列は月ごと
 */
function actualsToCSV(actuals) {
  const headers = ['KPI項目', '単位', ...actuals.map(a => `${a.year}年${a.month}月`)];
  const rows = [
    ['新規獲得ユーザー数（合計）', '人', ...actuals.map(a => a.newUsers.total)],
    ['├─ 1ヶ月プラン', '人', ...actuals.map(a => a.newUsers['1month'])],
    ['├─ 3ヶ月プラン', '人', ...actuals.map(a => a.newUsers['3month'])],
    ['└─ 5ヶ月プラン', '人', ...actuals.map(a => a.newUsers['5month'])],
    ['売上高（合計・税抜）', '円', ...actuals.map(a => a.revenue.total)],
    ['├─ 1ヶ月プラン売上', '円', ...actuals.map(a => a.revenue['1month'])],
    ['├─ 3ヶ月プラン売上', '円', ...actuals.map(a => a.revenue['3month'])],
    ['└─ 5ヶ月プラン売上', '円', ...actuals.map(a => a.revenue['5month'])],
    ['決済件数', '件', ...actuals.map(a => a.transactionCount)],
  ];

  const escape = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escape).join(',')];
  for (const r of rows) lines.push(r.map(escape).join(','));
  // BOM付きでExcel/Sheetsの日本語文字化け回避
  return '﻿' + lines.join('\n');
}

module.exports = { getMonthActuals, getActualsRange, actualsToCSV };
