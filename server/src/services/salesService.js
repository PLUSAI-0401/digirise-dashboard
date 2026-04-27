const stripe = require('../config/stripe');
const { getMonthRange, getPreviousMonth, CUTOFF_TIMESTAMP } = require('../utils/dateUtils');
const { isPermanentlyFree } = require('../utils/subscriptionFilters');

// 日本の消費税率（10%）。Stripeのcharge.amountは税込のため、税抜換算に使用
const TAX_RATE = 0.10;
const TAX_DIVISOR = 1 + TAX_RATE;

async function getMonthlyRevenue(year, month) {
  const { startTimestamp, endTimestamp } = getMonthRange(year, month);

  const charges = [];
  for await (const charge of stripe.charges.list({
    created: { gte: startTimestamp, lte: endTimestamp },
    limit: 100,
  })) {
    if (charge.status === 'succeeded' && !charge.refunded) {
      charges.push(charge);
    }
  }

  // 税込合計を算出後、税抜に換算（個別変換による丸め誤差を回避）
  const totalIncludingTax = charges.reduce((sum, charge) => {
    return sum + charge.amount - (charge.amount_refunded || 0);
  }, 0);
  const revenue = Math.round(totalIncludingTax / TAX_DIVISOR);

  return { revenue, transactionCount: charges.length };
}

// Stripe uses 365.25/12 = 30.4375 days/month for MRR normalization
const DAYS_PER_MONTH = 365.25 / 12;

// MRR計算: クーポン適用後の実績ベース（割引後・税抜）
// - invoice.total_excluding_tax を月次正規化して合算
// - 永続無料サブスクは除外
// - 期間限定100%off中の会員は total_excluding_tax=0 のため自然と¥0貢献
//   → クーポン期限切れ後に通常MRR貢献に切り替わる
async function calculateMRR() {
  let totalMRR = 0;

  for (const status of ['active', 'trialing']) {
    for await (const sub of stripe.subscriptions.list({
      status,
      created: { gte: CUTOFF_TIMESTAMP },
      limit: 100,
      expand: ['data.discount.coupon', 'data.customer', 'data.latest_invoice'],
    })) {
      // 永続無料は除外
      if (isPermanentlyFree(sub)) continue;

      const invoice = sub.latest_invoice;
      if (!invoice || typeof invoice !== 'object') continue;

      // 割引後・税抜の請求額（実績ベース）
      // total_excluding_tax: 全ての割引適用後・税適用前の合計額
      const billingAmount = invoice.total_excluding_tax ?? 0;
      if (billingAmount <= 0) continue;

      // 月次正規化のための課金間隔取得
      const item = sub.items?.data?.[0];
      if (!item?.price?.recurring) continue;

      const interval = item.price.recurring.interval;
      const intervalCount = item.price.recurring.interval_count || 1;

      let monthlyAmount = 0;
      switch (interval) {
        case 'month':
          monthlyAmount = billingAmount / intervalCount;
          break;
        case 'year':
          monthlyAmount = billingAmount / (12 * intervalCount);
          break;
        case 'week':
          monthlyAmount = (billingAmount * (DAYS_PER_MONTH / 7)) / intervalCount;
          break;
        case 'day':
          monthlyAmount = (billingAmount * DAYS_PER_MONTH) / intervalCount;
          break;
      }
      totalMRR += monthlyAmount;
    }
  }
  return Math.round(totalMRR);
}

async function getCumulativeRevenue() {
  let totalIncludingTax = 0;
  for await (const charge of stripe.charges.list({
    created: { gte: CUTOFF_TIMESTAMP },
    limit: 100,
  })) {
    if (charge.status === 'succeeded') {
      totalIncludingTax += charge.amount - (charge.amount_refunded || 0);
    }
  }
  // 税抜換算
  return Math.round(totalIncludingTax / TAX_DIVISOR);
}

async function getRevenueHistory(months = 6) {
  const now = new Date();
  const history = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const { revenue, transactionCount } = await getMonthlyRevenue(year, month);
    history.push({
      year,
      month,
      label: `${month}月`,
      revenue,
      transactionCount,
    });
  }

  return history;
}

async function getMonthlySummary(year, month) {
  const current = await getMonthlyRevenue(year, month);
  const prev = getPreviousMonth(year, month);
  const previous = await getMonthlyRevenue(prev.year, prev.month);

  const mrr = await calculateMRR();
  const cumulativeRevenue = await getCumulativeRevenue();
  const revenueHistory = await getRevenueHistory(6);

  const momAbsolute = current.revenue - previous.revenue;
  const momPercentage = previous.revenue > 0
    ? ((momAbsolute / previous.revenue) * 100).toFixed(1)
    : 0;

  return {
    currentMonth: {
      year,
      month,
      revenue: current.revenue,
      transactionCount: current.transactionCount,
    },
    previousMonth: {
      year: prev.year,
      month: prev.month,
      revenue: previous.revenue,
      transactionCount: previous.transactionCount,
    },
    monthOverMonth: {
      absolute: momAbsolute,
      percentage: parseFloat(momPercentage),
    },
    cumulativeRevenue,
    mrr,
    revenueHistory,
  };
}

module.exports = { getMonthlySummary };
