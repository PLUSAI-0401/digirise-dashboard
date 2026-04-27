const stripe = require('../config/stripe');
const { getMonthRange, getPreviousMonth, CUTOFF_TIMESTAMP } = require('../utils/dateUtils');

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

  const revenue = charges.reduce((sum, charge) => {
    return sum + charge.amount - (charge.amount_refunded || 0);
  }, 0);

  return { revenue, transactionCount: charges.length };
}

// Stripe uses 365.25/12 = 30.4375 days/month for MRR normalization
const DAYS_PER_MONTH = 365.25 / 12;

// MRR計算: Stripe基準（price.unit_amount × アクティブサブスク件数で算出、税抜）
// クーポン100%off案件もアクティブとしてカウント（Stripe側の仕様に合わせる）
async function calculateMRR() {
  let totalMRR = 0;

  for (const status of ['active', 'trialing']) {
    for await (const sub of stripe.subscriptions.list({
      status,
      created: { gte: CUTOFF_TIMESTAMP },
      limit: 100,
      expand: ['data.items.data.price'],
    })) {
      const item = sub.items?.data?.[0];
      const price = item?.price;
      if (!price?.unit_amount || !price?.recurring) continue;

      const amount = price.unit_amount;
      const intervalCount = price.recurring.interval_count || 1;

      let monthlyAmount = 0;
      switch (price.recurring.interval) {
        case 'month':
          monthlyAmount = amount / intervalCount;
          break;
        case 'year':
          monthlyAmount = amount / (12 * intervalCount);
          break;
        case 'week':
          monthlyAmount = (amount * (DAYS_PER_MONTH / 7)) / intervalCount;
          break;
        case 'day':
          monthlyAmount = (amount * DAYS_PER_MONTH) / intervalCount;
          break;
      }
      totalMRR += monthlyAmount;
    }
  }
  return Math.round(totalMRR);
}

async function getCumulativeRevenue() {
  let total = 0;
  for await (const charge of stripe.charges.list({
    created: { gte: CUTOFF_TIMESTAMP },
    limit: 100,
  })) {
    if (charge.status === 'succeeded') {
      total += charge.amount - (charge.amount_refunded || 0);
    }
  }
  return total;
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
