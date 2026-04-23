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

async function getMemberList(year, month) {
  const members = [];
  const productCache = {};

  const { startTimestamp, endTimestamp } = getMonthRange(year, month);

  for (const status of ['active', 'trialing', 'canceled']) {
    for await (const sub of stripe.subscriptions.list({
      status,
      created: { gte: CUTOFF_TIMESTAMP, lte: endTimestamp },
      limit: 100,
      expand: ['data.customer', 'data.latest_invoice', 'data.items.data.price'],
    })) {
      if (!hasPaidInvoice(sub)) continue;

      // For canceled subs: skip if canceled before the selected month started
      if (sub.status === 'canceled' && sub.canceled_at && sub.canceled_at < startTimestamp) continue;

      const custId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

      const customer = typeof sub.customer === 'object' ? sub.customer : null;
      const price = sub.items?.data?.[0]?.price;

      // Fetch product name (cached to avoid redundant API calls)
      let productName = 'プラン名不明';
      if (price?.product) {
        const productId = typeof price.product === 'string' ? price.product : price.product.id;
        if (!productCache[productId]) {
          try {
            const product = await stripe.products.retrieve(productId);
            productCache[productId] = product.name || 'プラン名不明';
          } catch (e) {
            productCache[productId] = 'プラン名不明';
          }
        }
        productName = productCache[productId];
      }

      const intervalCount = price?.recurring?.interval_count || 1;
      let intervalLabel;
      if (price?.recurring?.interval === 'month') {
        intervalLabel = intervalCount === 1 ? '月額' : `${intervalCount}ヶ月`;
      } else if (price?.recurring?.interval === 'year') {
        intervalLabel = intervalCount === 1 ? '年額' : `${intervalCount}年`;
      } else if (price?.recurring?.interval === 'day') {
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
        intervalLabel = price?.recurring?.interval || '';
      }

      // Fetch charge + balance_transaction for fee, refund, and reason
      const invoice = sub.latest_invoice;
      const chargeId = invoice?.charge;
      let paymentDate = null;
      let refundAmount = 0;
      let refundReason = '';
      let stripeFee = 0;
      let stripeFeeTax = 0;

      if (chargeId && typeof chargeId === 'string') {
        try {
          const charge = await stripe.charges.retrieve(chargeId, {
            expand: ['balance_transaction'],
          });
          paymentDate = charge.created ? new Date(charge.created * 1000).toISOString() : null;
          refundAmount = charge.amount_refunded || 0;

          // Get refund reason from the latest refund
          if (refundAmount > 0 && charge.refunds?.data?.length > 0) {
            const latestRefund = charge.refunds.data[0];
            const reasonMap = {
              duplicate: '重複',
              fraudulent: '不正利用',
              requested_by_customer: 'お客様の依頼',
            };
            refundReason = reasonMap[latestRefund.reason] || latestRefund.reason || '';
          }

          const bt = charge.balance_transaction;
          if (bt && typeof bt === 'object') {
            const totalFee = bt.fee || 0;
            // Stripe fee in Japan includes 10% consumption tax
            stripeFee = Math.round(totalFee / 1.1);
            stripeFeeTax = totalFee - stripeFee;
          }
        } catch (e) {
          // If charge fetch fails, leave defaults
        }
      }

      // Coupon / discount info
      let couponName = '';
      let couponAmount = 0;
      const discount = sub.discount;
      if (discount?.coupon) {
        couponName = discount.coupon.name || discount.coupon.id || '';
        const listPrice = price?.unit_amount || 0;
        const paidAmount = invoice?.amount_paid ?? listPrice;
        if (discount.coupon.percent_off) {
          couponAmount = Math.round(listPrice * discount.coupon.percent_off / 100);
        } else if (discount.coupon.amount_off) {
          couponAmount = discount.coupon.amount_off;
        } else if (listPrice > paidAmount) {
          couponAmount = listPrice - paidAmount;
        }
      }

      members.push({
        customerId: custId,
        chargeId: chargeId || '',
        email: customer?.email || '',
        name: customer?.name || '',
        amount: invoice?.amount_paid ?? price?.unit_amount ?? 0,
        planName: price?.nickname || `${productName}（${intervalLabel}）`,
        interval: price?.recurring?.interval || 'month',
        createdAt: new Date(sub.created * 1000).toISOString(),
        paymentDate,
        refundAmount,
        refundReason,
        couponName,
        couponAmount,
        stripeFee,
        stripeFeeTax,
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
