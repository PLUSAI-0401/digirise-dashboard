const stripe = require('../config/stripe');
const { getMonthRange, getPreviousMonth, CUTOFF_TIMESTAMP } = require('../utils/dateUtils');

// Stripe基準でアクティブサブスク件数を集計する（hasPaidInvoiceフィルタ・顧客重複排除なし）
// クーポン100%off案件もStripe側ではアクティブとして表示されるため、それに合わせる

async function getMemberMetrics(year, month) {
  const { startTimestamp, endTimestamp } = getMonthRange(year, month);

  // アクティブサブスク件数（Stripeの「有効」表示と一致）
  let totalActiveMembers = 0;
  for (const status of ['active', 'trialing']) {
    for await (const sub of stripe.subscriptions.list({
      status,
      created: { gte: CUTOFF_TIMESTAMP },
      limit: 100,
    })) {
      totalActiveMembers++;
    }
  }

  // 今月作成されたサブスク件数（新規入会）
  let newMembersThisMonth = 0;
  for await (const sub of stripe.subscriptions.list({
    created: { gte: startTimestamp, lte: endTimestamp },
    limit: 100,
  })) {
    newMembersThisMonth++;
  }

  // 今月キャンセルされたサブスク件数（解約）
  let churnedMembersThisMonth = 0;
  for await (const sub of stripe.subscriptions.list({
    status: 'canceled',
    created: { gte: CUTOFF_TIMESTAMP },
    limit: 100,
  })) {
    if (sub.canceled_at && sub.canceled_at >= startTimestamp && sub.canceled_at <= endTimestamp) {
      churnedMembersThisMonth++;
    }
  }

  // 解約率
  const activeAtStartOfMonth = totalActiveMembers + churnedMembersThisMonth - newMembersThisMonth;
  const churnRate = activeAtStartOfMonth > 0
    ? parseFloat(((churnedMembersThisMonth / activeAtStartOfMonth) * 100).toFixed(2))
    : 0;

  // 過去6ヶ月の会員推移
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

    let newCount = 0;
    for await (const sub of stripe.subscriptions.list({
      created: { gte: startTimestamp, lte: endTimestamp },
      limit: 100,
    })) {
      newCount++;
    }

    let churnedCount = 0;
    for await (const sub of stripe.subscriptions.list({
      status: 'canceled',
      created: { gte: CUTOFF_TIMESTAMP },
      limit: 100,
    })) {
      if (sub.canceled_at && sub.canceled_at >= startTimestamp && sub.canceled_at <= endTimestamp) {
        churnedCount++;
      }
    }

    history.push({
      year,
      month,
      label: `${month}月`,
      newMembers: newCount,
      churned: churnedCount,
    });
  }

  return history;
}

async function getMemberList(year, month) {
  const members = [];
  const productCache = {};

  const { startTimestamp, endTimestamp } = getMonthRange(year, month);

  // Invoice-based approach: list all paid invoices for the selected month
  // This captures every actual payment, including plan changes within the same subscription
  for await (const invoice of stripe.invoices.list({
    created: { gte: startTimestamp, lte: endTimestamp },
    status: 'paid',
    limit: 100,
    expand: ['data.customer', 'data.discounts'],
  })) {
    // Skip zero-amount invoices and non-subscription invoices
    if (invoice.amount_paid <= 0) continue;
    if (!invoice.subscription) continue;

    const customer = typeof invoice.customer === 'object' ? invoice.customer : null;
    const custId = customer?.id || invoice.customer;

    // Get plan info from invoice line items
    const lineItem = invoice.lines?.data?.[0];
    const price = lineItem?.price;

    // Fetch product name (cached)
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
    const chargeId = invoice.charge;
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

    // Coupon / discount info from invoice
    let couponName = '';
    let couponAmount = 0;
    const totalDiscount = invoice.total_discount_amounts;
    if (totalDiscount && totalDiscount.length > 0) {
      couponAmount = totalDiscount.reduce((sum, d) => sum + (d.amount || 0), 0);
    }
    const discounts = invoice.discounts;
    if (discounts && discounts.length > 0) {
      const disc = typeof discounts[0] === 'object' ? discounts[0] : null;
      if (disc?.coupon) {
        couponName = disc.coupon.name || disc.coupon.id || '';
      }
    }

    members.push({
      customerId: custId,
      chargeId: chargeId || '',
      email: customer?.email || invoice.customer_email || '',
      name: customer?.name || invoice.customer_name || '',
      amount: invoice.amount_paid,
      planName: price?.nickname || `${productName}（${intervalLabel}）`,
      interval: price?.recurring?.interval || '',
      createdAt: new Date(invoice.created * 1000).toISOString(),
      paymentDate,
      refundAmount,
      refundReason,
      couponName,
      couponAmount,
      stripeFee,
      stripeFeeTax,
      status: invoice.status,
    });
  }

  // Sort by paymentDate descending (newest first)
  members.sort((a, b) => new Date(b.paymentDate || b.createdAt) - new Date(a.paymentDate || a.createdAt));
  return members;
}

async function getWeeklyMemberHistory(weeks = 4) {
  const now = new Date();
  const history = [];

  // 現時点のアクティブサブスク件数（Stripe基準）
  let currentTotal = 0;
  for (const status of ['active', 'trialing']) {
    for await (const sub of stripe.subscriptions.list({
      status,
      created: { gte: CUTOFF_TIMESTAMP },
      limit: 100,
    })) {
      currentTotal++;
    }
  }

  for (let i = 0; i < weeks; i++) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - (i * 7));
    weekEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const startTs = Math.max(Math.floor(weekStart.getTime() / 1000), CUTOFF_TIMESTAMP);
    const endTs = Math.floor(weekEnd.getTime() / 1000);

    let newCount = 0;
    for await (const sub of stripe.subscriptions.list({
      created: { gte: startTs, lte: endTs },
      limit: 100,
    })) {
      newCount++;
    }

    let churnedCount = 0;
    for await (const sub of stripe.subscriptions.list({
      status: 'canceled',
      created: { gte: CUTOFF_TIMESTAMP },
      limit: 100,
    })) {
      if (sub.canceled_at && sub.canceled_at >= startTs && sub.canceled_at <= endTs) {
        churnedCount++;
      }
    }

    const sm = weekStart.getMonth() + 1;
    const sd = weekStart.getDate();
    const em = weekEnd.getMonth() + 1;
    const ed = weekEnd.getDate();

    history.unshift({
      label: `${sm}/${sd}〜${em}/${ed}`,
      newMembers: newCount,
      churned: churnedCount,
      total: currentTotal,
    });

    // 前週の累計 = 現累計 - 新規 + 解約
    if (i < weeks - 1) {
      currentTotal = currentTotal - newCount + churnedCount;
    }
  }

  return history;
}

module.exports = { getMemberMetrics, getMemberList, getWeeklyMemberHistory };
