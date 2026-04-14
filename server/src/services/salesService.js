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

// Check if subscription has actual payment (not ¥0 trial)
function hasPaidInvoice(sub) {
  const invoice = sub.latest_invoice;
  return invoice && typeof invoice === 'object' && invoice.amount_paid > 0;
}

// Apply subscription-level discount (coupon) to an amount
function applyDiscount(amount, discount) {
  if (!discount || !discount.coupon) return amount;
  const coupon = discount.coupon;
  if (coupon.percent_off) {
    return Math.round(amount * (1 - coupon.percent_off / 100));
  }
  if (coupon.amount_off) {
    return Math.max(0, amount - coupon.amount_off);
  }
  return amount;
}

async function calculateMRR() {
  let totalMRR = 0;

  for (const status of ['active', 'trialing']) {
    for await (const sub of stripe.subscriptions.list({
      status,
      created: { gte: CUTOFF_TIMESTAMP },
      limit: 100,
      expand: ['data.discount', 'data.latest_invoice'],
    })) {
      // For trialing subs, only count those with actual payment
      if (status === 'trialing' && !hasPaidInvoice(sub)) continue;

      let subMonthlyTotal = 0;
      for (const item of sub.items.data) {
        const price = item.price;
        const quantity = item.quantity || 1;
        const unitAmount = price.unit_amount || 0;

        if (price.recurring) {
          switch (price.recurring.interval) {
            case 'month':
              subMonthlyTotal += unitAmount * quantity / price.recurring.interval_count;
              break;
            case 'year':
              subMonthlyTotal += (unitAmount * quantity) / (12 * price.recurring.interval_count);
              break;
            case 'week':
              subMonthlyTotal += (unitAmount * quantity * 4.33) / price.recurring.interval_count;
              break;
            case 'day':
              subMonthlyTotal += (unitAmount * quantity * 30) / price.recurring.interval_count;
              break;
          }
        }
      }
      totalMRR += applyDiscount(subMonthlyTotal, sub.discount);
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
