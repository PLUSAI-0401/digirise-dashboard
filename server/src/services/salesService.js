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

async function calculateMRR() {
  let totalMRR = 0;
  for await (const sub of stripe.subscriptions.list({
    status: 'active',
    created: { gte: CUTOFF_TIMESTAMP },
    limit: 100,
  })) {
    for (const item of sub.items.data) {
      const price = item.price;
      const quantity = item.quantity || 1;
      const unitAmount = price.unit_amount || 0;

      if (price.recurring) {
        switch (price.recurring.interval) {
          case 'month':
            totalMRR += unitAmount * quantity / price.recurring.interval_count;
            break;
          case 'year':
            totalMRR += (unitAmount * quantity) / (12 * price.recurring.interval_count);
            break;
          case 'week':
            totalMRR += (unitAmount * quantity * 4.33) / price.recurring.interval_count;
            break;
          case 'day':
            totalMRR += (unitAmount * quantity * 30) / price.recurring.interval_count;
            break;
        }
      }
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
