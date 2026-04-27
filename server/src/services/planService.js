const stripe = require('../config/stripe');
const { CUTOFF_TIMESTAMP } = require('../utils/dateUtils');
const { isPermanentlyFree } = require('../utils/subscriptionFilters');

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
    // 永続無料を除外したアクティブサブスク件数 + 月次実績売上を集計
    let subscriberCount = 0;
    let actualMonthlyRevenue = 0;
    const DAYS_PER_MONTH = 365.25 / 12;

    for await (const sub of stripe.subscriptions.list({
      status: 'active',
      price: price.id,
      created: { gte: CUTOFF_TIMESTAMP },
      limit: 100,
      expand: ['data.discount.coupon', 'data.customer', 'data.latest_invoice'],
    })) {
      if (isPermanentlyFree(sub)) continue;
      subscriberCount++;

      // 各サブスクの実績ベース月次売上（割引後・税抜）
      const inv = sub.latest_invoice;
      const billingAmount = (inv && typeof inv === 'object') ? (inv.total_excluding_tax ?? 0) : 0;
      if (billingAmount <= 0) continue;

      const intervalCount = price.recurring.interval_count || 1;
      let monthly = 0;
      switch (price.recurring.interval) {
        case 'month': monthly = billingAmount / intervalCount; break;
        case 'year': monthly = billingAmount / (12 * intervalCount); break;
        case 'week': monthly = (billingAmount * (DAYS_PER_MONTH / 7)) / intervalCount; break;
        case 'day': monthly = (billingAmount * DAYS_PER_MONTH) / intervalCount; break;
      }
      actualMonthlyRevenue += monthly;
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

    planData.push({
      planId: price.id,
      planName: `${productName}（${intervalLabel}）`,
      interval: price.recurring.interval,
      unitAmount: price.unit_amount,
      activeSubscribers: subscriberCount,
      monthlyRevenue: Math.round(actualMonthlyRevenue),
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
