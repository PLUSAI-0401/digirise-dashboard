// サブスク集計用の共通フィルタ
// 「永続無料（社内テスト・特別契約等）」を除外する判定ロジック

function couponIsPermanentFree(coupon) {
  if (!coupon || typeof coupon !== 'object') return false;
  return coupon.percent_off === 100 && coupon.duration === 'forever';
}

/**
 * サブスクが「永続無料」かどうかを判定する。
 * 以下のいずれかに該当すれば true:
 *   - サブスクの discount (legacy) が 100%off + duration=forever
 *   - サブスクの discounts (新plural) のいずれかが 100%off + duration=forever
 *   - 顧客レベルの discount が 100%off + duration=forever
 *
 * 期間限定割引 (duration=once / repeating) は対象外（いずれ課金されるため含める）
 */
function isPermanentlyFree(sub) {
  // sub.discount (legacy single-discount field)
  if (couponIsPermanentFree(sub.discount?.coupon)) return true;

  // sub.discounts (新しい複数割引対応)
  if (Array.isArray(sub.discounts)) {
    for (const d of sub.discounts) {
      if (typeof d === 'object' && couponIsPermanentFree(d.coupon)) return true;
    }
  }

  // 顧客レベルの永続無料割引（全サブスクに自動適用される）
  const cust = typeof sub.customer === 'object' ? sub.customer : null;
  if (cust && couponIsPermanentFree(cust.discount?.coupon)) return true;

  return false;
}

module.exports = { isPermanentlyFree, couponIsPermanentFree };
