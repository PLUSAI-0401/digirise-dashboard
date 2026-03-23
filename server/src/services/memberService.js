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

async function getMemberList() {
  const members = [];
  const seen = new Set();

  for (const status of ['active', 'trialing', 'canceled']) {
    for await (const sub of stripe.subscriptions.list({
      status,
      created: { gte: CUTOFF_TIMESTAMP },
      limit: 100,
      expand: ['data.customer', 'data.latest_invoice', 'data.items.data.price'],
    })) {
      if (!hasPaidInvoice(sub)) continue;
      const custId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
      if (seen.has(custId)) continue;
      seen.add(custId);

      const customer = typeof sub.customer === 'object' ? sub.customer : null;
      const price = sub.items?.data?.[0]?.price;

      members.push({
        email: customer?.email || '',
        name: customer?.name || '',
        amount: price?.unit_amount || 0,
        planName: price?.nickname || price?.product?.name || 'プラン不明',
        interval: price?.recurring?.interval || 'month',
        createdAt: new Date(sub.created * 1000).toISOString(),
        status: sub.status,
      });
    }
  }

  // Sort by createdAt descending (newest first)
  members.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return members;
}

async function getWeeklyMemberHistory(weeks = 4) {
  const now = new Date();
  const history = [];

  // Get all active members count as of now
  const activeCustomers = new Set();
  for (const status of ['active', 'trialing']) {
    for await (const sub of stripe.subscriptions.list({
      status,
      created: { gte: CUTOFF_TIMESTAMP },
      limit: 100,
      expand: ['data.latest_invoice'],
    })) {
      if (hasPaidInvoice(sub)) activeCustomers.add(sub.customer);
    }
  }
  let currentTotal = activeCustomers.size;

  for (let i = 0; i < weeks; i++) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - (i * 7));
    weekEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const startTs = Math.max(Math.floor(weekStart.getTime() / 1000), CUTOFF_TIMESTAMP);
    const endTs = Math.floor(weekEnd.getTime() / 1000);

    const newCusts = new Set();
    for await (const sub of stripe.subscriptions.list({
      created: { gte: startTs, lte: endTs },
      limit: 100,
      expand: ['data.latest_invoice'],
    })) {
      if (hasPaidInvoice(sub)) newCusts.add(sub.customer);
    }

    const churnedCusts = new Set();
    for await (const sub of stripe.subscriptions.list({
      status: 'canceled',
      created: { gte: CUTOFF_TIMESTAMP },
      limit: 100,
      expand: ['data.latest_invoice'],
    })) {
      if (sub.canceled_at && sub.canceled_at >= startTs && sub.canceled_at <= endTs && hasPaidInvoice(sub)) {
        churnedCusts.add(sub.customer);
      }
    }

    const sm = weekStart.getMonth() + 1;
    const sd = weekStart.getDate();
    const em = weekEnd.getMonth() + 1;
    const ed = weekEnd.getDate();

    history.unshift({
      label: `${sm}/${sd}〜${em}/${ed}`,
      newMembers: newCusts.size,
      churned: churnedCusts.size,
      total: currentTotal,
    });

    // Walk back: previous week's total = current - new + churned
    if (i < weeks - 1) {
      currentTotal = currentTotal - newCusts.size + churnedCusts.size;
    }
  }

  return history;
}

module.exports = { getMemberMetrics, getMemberList, getWeeklyMemberHistory };
