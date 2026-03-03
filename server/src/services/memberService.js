const stripe = require('../config/stripe');
const { getMonthRange, getPreviousMonth, CUTOFF_TIMESTAMP } = require('../utils/dateUtils');

// Check if subscription has actual payment (not ¥0 trial)
function hasPaidInvoice(sub) {
  const invoice = sub.latest_invoice;
  return invoice && typeof invoice === 'object' && invoice.amount_paid > 0;
}

async function getMemberMetrics(year, month) {
  const { startTimestamp, endTimestamp } = getMonthRange(year, month);

  // Active subscriptions with actual payment, created after cutoff only
  const activeCustomers = new Set();
  for await (const sub of stripe.subscriptions.list({
    status: 'active',
    created: { gte: CUTOFF_TIMESTAMP },
    limit: 100,
    expand: ['data.latest_invoice'],
  })) {
    if (hasPaidInvoice(sub)) {
      activeCustomers.add(sub.customer);
    }
  }
  for await (const sub of stripe.subscriptions.list({
    status: 'trialing',
    created: { gte: CUTOFF_TIMESTAMP },
    limit: 100,
    expand: ['data.latest_invoice'],
  })) {
    if (hasPaidInvoice(sub)) {
      activeCustomers.add(sub.customer);
    }
  }
  const totalActiveMembers = activeCustomers.size;

  // New subscriptions this month (with actual payment)
  const newCustomers = new Set();
  for await (const sub of stripe.subscriptions.list({
    created: { gte: startTimestamp, lte: endTimestamp },
    limit: 100,
    expand: ['data.latest_invoice'],
  })) {
    if (hasPaidInvoice(sub)) {
      newCustomers.add(sub.customer);
    }
  }
  const newMembersThisMonth = newCustomers.size;

  // Churned subscriptions this month (created after cutoff only)
  const churnedCustomers = new Set();
  for await (const sub of stripe.subscriptions.list({
    status: 'canceled',
    created: { gte: CUTOFF_TIMESTAMP },
    limit: 100,
    expand: ['data.latest_invoice'],
  })) {
    if (sub.canceled_at && sub.canceled_at >= startTimestamp && sub.canceled_at <= endTimestamp && hasPaidInvoice(sub)) {
      churnedCustomers.add(sub.customer);
    }
  }
  const churnedMembersThisMonth = churnedCustomers.size;

  // Churn rate
  const activeAtStartOfMonth = totalActiveMembers + churnedMembersThisMonth - newMembersThisMonth;
  const churnRate = activeAtStartOfMonth > 0
    ? parseFloat(((churnedMembersThisMonth / activeAtStartOfMonth) * 100).toFixed(2))
    : 0;

  // Member history (last 6 months)
  const memberHistory = await getMemberHistory(6);

  return {
    totalActiveMembers,
    newMembersThisMonth,
    churnedMembersThisMonth,
    churnRate,
    netGrowth: newMembersThisMonth - churnedMembersThisMonth,
    memberHistory,
  };
}

async function getMemberHistory(months = 6) {
  const now = new Date();
  const history = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const { startTimestamp, endTimestamp } = getMonthRange(year, month);

    const newCusts = new Set();
    for await (const sub of stripe.subscriptions.list({
      created: { gte: startTimestamp, lte: endTimestamp },
      limit: 100,
      expand: ['data.latest_invoice'],
    })) {
      if (hasPaidInvoice(sub)) {
        newCusts.add(sub.customer);
      }
    }

    const churnedCusts = new Set();
    for await (const sub of stripe.subscriptions.list({
      status: 'canceled',
      created: { gte: CUTOFF_TIMESTAMP },
      limit: 100,
      expand: ['data.latest_invoice'],
    })) {
      if (sub.canceled_at && sub.canceled_at >= startTimestamp && sub.canceled_at <= endTimestamp && hasPaidInvoice(sub)) {
        churnedCusts.add(sub.customer);
      }
    }

    history.push({
      year,
      month,
      label: `${month}月`,
      newMembers: newCusts.size,
      churned: churnedCusts.size,
    });
  }

  return history;
}

module.exports = { getMemberMetrics };
