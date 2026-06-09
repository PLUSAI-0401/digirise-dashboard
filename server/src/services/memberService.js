const stripe = require('../config/stripe');
const { getMonthRange, getPreviousMonth, CUTOFF_TIMESTAMP } = require('../utils/dateUtils');
const { isPermanentlyFree, getPlanKey } = require('../utils/subscriptionFilters');

// 集計方針：
// - 有料契約しているユーザー（クーポン100%offで実質無料の方も含む）をカウント
// - 「永続無料（100%off + duration=forever のクーポン）」は社内テスト/特別契約として除外
// - 「累計支払¥0の顧客」もテストユーザーとして除外（初回決済失敗の incomplete_expired や
//   期間限定無料中に解約した会員など、サービス利用料金が一度も発生していない顧客）
// - 期間限定割引中(duration=once)で課金実績がある会員は含める
//
// 過去月の数値を確定値にするため、新規入会の集計は「subscription_create インボイス」ベース。
// インボイスは解約しても消えないので、過去月のデータが時間経過で変動しません。

function emptyPlanCounts() {
  return { '1month': 0, '3month': 0, '5month': 0, other: 0 };
}

/**
 * 顧客ごとの累計支払額(税込)を集計して返す。
 * AIスクールのサブスク決済のみ対象（イベント等の単発決済は除く）。
 * 返金は控除済み。
 * 「累計支払¥0」の顧客 = テストユーザー判定に使用。
 */
async function getCustomerPaidMap() {
  const map = new Map();
  for await (const ch of stripe.charges.list({
    created: { gte: CUTOFF_TIMESTAMP },
    limit: 100,
    expand: ['data.invoice'],
  })) {
    if (ch.status !== 'succeeded') continue;
    const inv = ch.invoice;
    // AIスクールサブスク決済のみ
    if (!inv || typeof inv !== 'object' || !inv.subscription) continue;
    const custId = typeof ch.customer === 'string' ? ch.customer : ch.customer?.id;
    if (!custId) continue;
    const net = ch.amount - (ch.amount_refunded || 0);
    map.set(custId, (map.get(custId) || 0) + net);
  }
  return map;
}

/**
 * テストユーザーかどうかを判定（累計支払¥0なら true）。
 * paidMap は getCustomerPaidMap() で事前に作成しておく。
 */
function isTestUserBySub(sub, paidMap) {
  const custId = typeof sub.customer === 'object' && sub.customer ? sub.customer.id : sub.customer;
  if (!custId) return true; // 顧客IDが取れない時点で除外
  return (paidMap.get(custId) || 0) === 0;
}

function isTestUserByCustomerId(customerId, paidMap) {
  if (!customerId) return true;
  return (paidMap.get(customerId) || 0) === 0;
}

// インボイスのline itemからプラン種別を判定（subscriptionをexpand不要）
function getPlanKeyFromInvoice(invoice) {
  const lineItem = invoice.lines?.data?.[0];
  const price = lineItem?.price;
  if (!price?.recurring) return 'other';
  const ic = price.recurring.interval_count || 1;
  if (price.recurring.interval === 'month') {
    if (ic === 1) return '1month';
    if (ic === 3) return '3month';
    if (ic === 5) return '5month';
  } else if (price.recurring.interval === 'day') {
    if (ic >= 28 && ic <= 31) return '1month';
    if (ic >= 89 && ic <= 92) return '3month';
    if (ic >= 148 && ic <= 152) return '5month';
  }
  return 'other';
}

/**
 * 指定期間内に新規入会した会員の件数・プラン別売上を返す。
 * subscription_create インボイス（status=paid）ベースで集計するため、
 * 後から該当サブスクが解約されても、過去の数値は変動しません。
 * paidMap を渡すと「累計支払¥0の顧客」を除外します。
 */
async function getNewMembersForPeriod(startTs, endTs, paidMap = null) {
  let count = 0;
  const byPlan = emptyPlanCounts();
  const revenueByPlan = { '1month': 0, '3month': 0, '5month': 0, other: 0 };
  const seenSubs = new Set();

  for await (const invoice of stripe.invoices.list({
    created: { gte: startTs, lte: endTs },
    status: 'paid',
    limit: 100,
    expand: [
      'data.subscription.discount.coupon',
      'data.subscription.customer',
      'data.lines.data.price',
    ],
  })) {
    // 新規入会の初回インボイスのみ対象
    if (invoice.billing_reason !== 'subscription_create') continue;
    if (!invoice.subscription || typeof invoice.subscription !== 'object') continue;

    const sub = invoice.subscription;
    // 同一subが複数のsubscription_createインボイスを持つことは通常ないが、安全のため重複排除
    if (seenSubs.has(sub.id)) continue;
    seenSubs.add(sub.id);

    // 永続無料は除外（社内テスト・特別契約）
    if (isPermanentlyFree(sub)) continue;

    // 累計支払¥0の顧客（テストユーザー）は除外
    if (paidMap && isTestUserBySub(sub, paidMap)) continue;

    const k = getPlanKeyFromInvoice(invoice);
    count++;
    byPlan[k]++;

    // 初回決済額（割引後・税抜の実績）
    const taxExcl = invoice.total_excluding_tax ?? Math.round((invoice.amount_paid || 0) / 1.1);
    revenueByPlan[k] += taxExcl;
  }

  return { count, byPlan, revenueByPlan };
}

/**
 * 指定期間内に解約された会員の件数を返す（canceled_at基準で確定値）。
 * paidMap を渡すと「累計支払¥0の顧客」を除外します。
 */
async function getChurnedForPeriod(startTs, endTs, paidMap = null) {
  let count = 0;
  const byPlan = emptyPlanCounts();
  for await (const sub of stripe.subscriptions.list({
    status: 'canceled',
    created: { gte: CUTOFF_TIMESTAMP },
    limit: 100,
    expand: ['data.discount.coupon', 'data.customer', 'data.items.data.price'],
  })) {
    if (!sub.canceled_at) continue;
    if (sub.canceled_at < startTs || sub.canceled_at > endTs) continue;
    if (isPermanentlyFree(sub)) continue;
    // 累計支払¥0の顧客（テストユーザー）は除外
    if (paidMap && isTestUserBySub(sub, paidMap)) continue;
    count++;
    byPlan[getPlanKey(sub)]++;
  }
  return { count, byPlan };
}

async function getMemberMetrics(year, month) {
  const { startTimestamp, endTimestamp } = getMonthRange(year, month);

  // 顧客ごとの累計支払額マップを作成（テストユーザー判定用、最初に1回だけ）
  const paidMap = await getCustomerPaidMap();

  // アクティブサブスク件数（リアルタイム値、永続無料 + 累計支払¥0顧客 を除外）+ プラン別内訳
  let totalActiveMembers = 0;
  const activeByPlan = emptyPlanCounts();
  for (const status of ['active', 'trialing']) {
    for await (const sub of stripe.subscriptions.list({
      status,
      created: { gte: CUTOFF_TIMESTAMP },
      limit: 100,
      expand: ['data.discount.coupon', 'data.customer', 'data.items.data.price'],
    })) {
      if (isPermanentlyFree(sub)) continue;
      if (isTestUserBySub(sub, paidMap)) continue;
      totalActiveMembers++;
      activeByPlan[getPlanKey(sub)]++;
    }
  }

  // 新規入会数・売上（インボイスベースの確定値、テストユーザー除外）
  const newInfo = await getNewMembersForPeriod(startTimestamp, endTimestamp, paidMap);
  const newMembersThisMonth = newInfo.count;
  const newByPlan = newInfo.byPlan;
  const newRevenueByPlan = newInfo.revenueByPlan;

  // 解約数（canceled_at基準の確定値、テストユーザー除外）
  const churnInfo = await getChurnedForPeriod(startTimestamp, endTimestamp, paidMap);
  const churnedMembersThisMonth = churnInfo.count;
  const churnedByPlan = churnInfo.byPlan;

  // 解約率
  const activeAtStartOfMonth = totalActiveMembers + churnedMembersThisMonth - newMembersThisMonth;
  const churnRate = activeAtStartOfMonth > 0
    ? parseFloat(((churnedMembersThisMonth / activeAtStartOfMonth) * 100).toFixed(2))
    : 0;

  // 過去6ヶ月の会員推移（同じpaidMapを使い回す）
  const memberHistory = await getMemberHistory(6, paidMap);

  return {
    totalActiveMembers,
    activeByPlan,
    newMembersThisMonth,
    newByPlan,
    newRevenueByPlan,
    churnedMembersThisMonth,
    churnedByPlan,
    churnRate,
    netGrowth: newMembersThisMonth - churnedMembersThisMonth,
    memberHistory,
  };
}

async function getMemberHistory(months = 6, paidMap = null) {
  const now = new Date();
  const history = [];

  // paidMap が未指定なら作成
  if (!paidMap) paidMap = await getCustomerPaidMap();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const { startTimestamp, endTimestamp } = getMonthRange(year, month);

    // 新規入会・解約（共に確定値、テストユーザー除外）
    const newInfo = await getNewMembersForPeriod(startTimestamp, endTimestamp, paidMap);
    const churnInfo = await getChurnedForPeriod(startTimestamp, endTimestamp, paidMap);

    history.push({
      year,
      month,
      label: `${month}月`,
      newMembers: newInfo.count,
      newByPlan: newInfo.byPlan,
      churned: churnInfo.count,
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

  // 顧客ごとの累計支払額マップを作成
  const paidMap = await getCustomerPaidMap();

  // 現時点のアクティブサブスク件数（永続無料 + テストユーザー除外）
  let currentTotal = 0;
  for (const status of ['active', 'trialing']) {
    for await (const sub of stripe.subscriptions.list({
      status,
      created: { gte: CUTOFF_TIMESTAMP },
      limit: 100,
      expand: ['data.discount.coupon', 'data.customer'],
    })) {
      if (isPermanentlyFree(sub)) continue;
      if (isTestUserBySub(sub, paidMap)) continue;
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

    // 新規入会・解約（共に確定値、テストユーザー除外）
    const newInfo = await getNewMembersForPeriod(startTs, endTs, paidMap);
    const churnInfo = await getChurnedForPeriod(startTs, endTs, paidMap);
    const newCount = newInfo.count;
    const churnedCount = churnInfo.count;

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

module.exports = {
  getMemberMetrics,
  getMemberList,
  getWeeklyMemberHistory,
  getNewMembersForPeriod,
  getChurnedForPeriod,
  getCustomerPaidMap,
  isTestUserBySub,
  isTestUserByCustomerId,
};
