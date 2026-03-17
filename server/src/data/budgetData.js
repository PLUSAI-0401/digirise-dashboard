// 予実管理シート（デジライズC）の予算データ
// 期間: 2026年2月 ～ 2027年1月

const BUDGET_MONTHS = [
  { year: 2026, month: 2 },
  { year: 2026, month: 3 },
  { year: 2026, month: 4 },
  { year: 2026, month: 5 },
  { year: 2026, month: 6 },
  { year: 2026, month: 7 },
  { year: 2026, month: 8 },
  { year: 2026, month: 9 },
  { year: 2026, month: 10 },
  { year: 2026, month: 11 },
  { year: 2026, month: 12 },
  { year: 2027, month: 1 },
];

// 売上高（千円）
const REVENUE_BUDGET = {
  total:     [2276, 2693, 3196, 4187, 5682, 6379, 7467, 8164, 8756, 11026, 11912, 13095],
  plan1month: [297,  569,  827, 1077, 1320, 1570, 1829, 2094, 2377,  2681,  2997,  3340],
  plan3month: [706,  759,  853, 1481, 1592, 1781, 2339, 2518, 2547,  3303,  3525,  3847],
  plan5month: [1272, 1365, 1516, 1628, 2770, 3029, 3299, 3553, 3832, 5042,  5389,  5907],
};

// 新規獲得ユーザー数（人）
const NEW_USERS_BUDGET = {
  total:              [63, 68, 76, 82, 88, 97, 105, 113, 123, 135, 144, 157],
  plan1month_ad:      [ 5,  5,  5,  6,  6,  6,   6,   6,   7,   7,   7,   7],
  plan1month_organic: [14, 15, 17, 19, 21, 23,  25,  27,  30,  33,  36,  40],
  plan3month_ad:      [ 5,  5,  6,  6,  6,  7,   7,   7,   7,   8,   7,   7],
  plan3month_organic: [14, 15, 17, 19, 21, 23,  25,  27,  30,  33,  36,  40],
  plan5month_ad:      [ 7,  7,  8,  8,  8,  9,   9,   9,   9,  10,   9,  10],
  plan5month_organic: [19, 21, 23, 25, 27, 30,  33,  36,  40,  44,  49,  53],
};

// ARPU（円）
const ARPU = {
  plan1month: [15950, 15950, 15950, 15950, 0, 0, 0, 0, 0, 0, 0, 0],
  plan3month: 37125,
  plan5month: 49500,
};

// LINE登録数（人）
const LINE_REGISTRATIONS_BUDGET = [789, 849, 915, 981, 971, 1038, 1110, 1084, 1151, 1213, 1142, 1164];

// 広告ファネル指標
const AD_FUNNEL = {
  cpm:              [1850, 1890, 1930, 1980, 2030, 2090, 2150, 2220, 2300, 2400, 2550, 2750],
  impressions:      [758324, 816502, 879538, 943060, 1011815, 1081045, 1155964, 1231466, 1307495, 1378318, 1426965, 1455504],
  ctr:              [0.008, 0.008, 0.008, 0.008, 0.008, 0.008, 0.008, 0.008, 0.008, 0.008, 0.008, 0.008],
  lpVisits:         [6067, 6532, 7036, 7544, 8095, 8648, 9248, 9852, 10460, 11027, 11416, 11644],
  lineRegRate:      [0.13, 0.13, 0.13, 0.13, 0.12, 0.12, 0.12, 0.11, 0.11, 0.11, 0.10, 0.10],
  lineRegistrations: LINE_REGISTRATIONS_BUDGET,
  seminarApplyRate: [0.13, 0.13, 0.13, 0.13, 0.13, 0.13, 0.13, 0.13, 0.13, 0.13, 0.13, 0.13],
  seminarApplies:   [103, 110, 119, 128, 126, 135, 144, 141, 150, 158, 148, 151],
  cvr:              [0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15],
  conversions:      [15, 17, 18, 19, 19, 20, 22, 21, 22, 24, 22, 23],
};

// PL指標（千円）
const PL = {
  variableCosts:  [1728, 1868, 2022, 2192, 2379, 2584, 2810, 3059, 3332, 3633, 3963, 4327],
  grossProfit:    [549, 825, 1174, 1995, 3303, 3795, 4657, 5106, 5424, 7394, 7949, 8767],
  grossMargin:    [0.24, 0.31, 0.37, 0.48, 0.58, 0.59, 0.62, 0.63, 0.62, 0.67, 0.67, 0.67],
  fixedCosts:     [3250, 3250, 3250, 3250, 3250, 3250, 3250, 3250, 3250, 3250, 3250, 3250],
  operatingProfit:[-2701, -2425, -2076, -1255, 53, 545, 1407, 1856, 2174, 4144, 4699, 5517],
  operatingMargin:[-1.19, -0.90, -0.65, -0.30, 0.01, 0.09, 0.19, 0.23, 0.25, 0.38, 0.39, 0.42],
};

function getMonthIndex(year, month) {
  return BUDGET_MONTHS.findIndex(m => m.year === year && m.month === month);
}

function getBudgetForMonth(year, month) {
  const idx = getMonthIndex(year, month);
  if (idx === -1) return null;

  return {
    period: BUDGET_MONTHS[idx],
    revenue: {
      total: REVENUE_BUDGET.total[idx] * 1000,
      plan1month: REVENUE_BUDGET.plan1month[idx] * 1000,
      plan3month: REVENUE_BUDGET.plan3month[idx] * 1000,
      plan5month: REVENUE_BUDGET.plan5month[idx] * 1000,
    },
    newUsers: {
      total: NEW_USERS_BUDGET.total[idx],
      plan1month_ad: NEW_USERS_BUDGET.plan1month_ad[idx],
      plan1month_organic: NEW_USERS_BUDGET.plan1month_organic[idx],
      plan3month_ad: NEW_USERS_BUDGET.plan3month_ad[idx],
      plan3month_organic: NEW_USERS_BUDGET.plan3month_organic[idx],
      plan5month_ad: NEW_USERS_BUDGET.plan5month_ad[idx],
      plan5month_organic: NEW_USERS_BUDGET.plan5month_organic[idx],
    },
    arpu: {
      plan1month: ARPU.plan1month[idx],
      plan3month: ARPU.plan3month,
      plan5month: ARPU.plan5month,
    },
    lineRegistrations: LINE_REGISTRATIONS_BUDGET[idx],
    funnel: {
      impressions: AD_FUNNEL.impressions[idx],
      ctr: AD_FUNNEL.ctr[idx],
      lpVisits: AD_FUNNEL.lpVisits[idx],
      lineRegRate: AD_FUNNEL.lineRegRate[idx],
      lineRegistrations: AD_FUNNEL.lineRegistrations[idx],
      seminarApplyRate: AD_FUNNEL.seminarApplyRate[idx],
      seminarApplies: AD_FUNNEL.seminarApplies[idx],
      cvr: AD_FUNNEL.cvr[idx],
      conversions: AD_FUNNEL.conversions[idx],
    },
    pl: {
      grossProfit: PL.grossProfit[idx] * 1000,
      grossMargin: PL.grossMargin[idx],
      operatingProfit: PL.operatingProfit[idx] * 1000,
      operatingMargin: PL.operatingMargin[idx],
    },
  };
}

function getBudgetTimeline() {
  return BUDGET_MONTHS.map((m, idx) => ({
    year: m.year,
    month: m.month,
    label: `${m.month}月`,
    revenue: REVENUE_BUDGET.total[idx] * 1000,
    newUsers: NEW_USERS_BUDGET.total[idx],
    lineRegistrations: LINE_REGISTRATIONS_BUDGET[idx],
  }));
}

module.exports = { getBudgetForMonth, getBudgetTimeline, BUDGET_MONTHS };
