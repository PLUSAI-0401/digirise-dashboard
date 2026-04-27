const stripe = require('../config/stripe');
const { CUTOFF_TIMESTAMP } = require('../utils/dateUtils');

async function getPlanBreakdown() {
  // Get all active recurring prices with product info
  const prices = [];
  for await (const price of stripe.prices.list({
    active: true,
    type: 'recurring',
    limit: 100,
    expand: ['data.product'],
  })) {
    prices.push(price);
  }

  const planData = [];

  for (const price of prices) {
    // Stripe基準: アクティブなサブスク件数を数える（hasPaidInvoiceフィルタ・顧客重複排除なし）
    let subscriberCount = 0;
    for await (const sub of stripe.subscriptions.list({
      status: 'active',
      price: price.id,
      created: { gte: CUTOFF_TIMESTAMP },
      limit: 100,
    })) {
      subscriberCount++;
    }

    if (subscriberCount === 0) continue;

    const productName = (typeof price.product === 'object' && price.product.name)
      ? price.product.name
      : 'プラン名不明';

    const intervalCount = price.recurring.interval_count || 1;

    // Create human-readable billing period label
    let intervalLabel;
    if (price.recurring.interval === 'month') {
      intervalLabel = intervalCount === 1 ? '月額' : `${intervalCount}ヶ月`;
    } else if (price.recurring.interval === 'year') {
      intervalLabel = intervalCount === 1 ? '年額' : `${intervalCount}年`;
    } else if (price.recurring.interval === 'day') {
      if (intervalCount >= 28 && intervalCount <= 31) {
        intervalLabel = '月額';
      } else if (intervalCount >= 89 && intervalCount <= 92) {
        intervalLabel = '3ヶ月';
      } else if (intervalCount >= 148 && intervalCount <= 152) {
        intervalLabel = '5ヶ月';
      } else {
        intervalLabel = `${intervalCount}日`;
      }
    } else {
      intervalLabel = price.recurring.interval;
    }

    // 月次売上に正規化（Stripe基準: 365.25/12 = 30.4375日/月）
    const DAYS_PER_MONTH = 365.25 / 12;
    let monthlyPerSub = price.unit_amount;
    if (price.recurring.interval === 'year') {
      monthlyPerSub = Math.round(price.unit_amount / (12 * intervalCount));
    } else if (price.recurring.interval === 'month') {
      monthlyPerSub = Math.round(price.unit_amount / intervalCount);
    } else if (price.recurring.interval === 'week') {
      monthlyPerSub = Math.round((price.unit_amount * (DAYS_PER_MONTH / 7)) / intervalCount);
    } else if (price.recurring.interval === 'day') {
      monthlyPerSub = Math.round((price.unit_amount * DAYS_PER_MONTH) / intervalCount);
    }

    planData.push({
      planId: price.id,
      planName: `${productName}（${intervalLabel}）`,
      interval: price.recurring.interval,
      unitAmount: price.unit_amount,
      activeSubscribers: subscriberCount,
      monthlyRevenue: monthlyPerSub * subscriberCount,
    });
  }

  // Calculate percentages
  const totalMonthlyRevenue = planData.reduce((sum, p) => sum + p.monthlyRevenue, 0);
  planData.forEach(p => {
    p.percentageOfTotal = totalMonthlyRevenue > 0
      ? parseFloat(((p.monthlyRevenue / totalMonthlyRevenue) * 100).toFixed(1))
      : 0;
  });

  // Sort by revenue descending
  planData.sort((a, b) => b.monthlyRevenue - a.monthlyRevenue);

  return { plans: planData, totalMonthlyRevenue };
}

module.exports = { getPlanBreakdown };
