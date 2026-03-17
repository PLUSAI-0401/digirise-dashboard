import { useState, useEffect, useCallback } from 'react';
import { fetchSummary, fetchMembers, fetchPlans, fetchBudget, refreshCache } from '../api/dashboard';

// Demo data based on actual Stripe data for preview when API is unavailable
const DEMO_SUMMARY = {
  currentMonth: { year: 2026, month: 3, revenue: 99000, transactionCount: 2 },
  previousMonth: { year: 2026, month: 2, revenue: 253475, transactionCount: 12 },
  monthOverMonth: { absolute: -154475, percentage: -60.9 },
  cumulativeRevenue: 856750,
  mrr: 148500,
  revenueHistory: [
    { year: 2025, month: 10, label: '10月', revenue: 0 },
    { year: 2025, month: 11, label: '11月', revenue: 0 },
    { year: 2025, month: 12, label: '12月', revenue: 10450 },
    { year: 2026, month: 1, label: '1月', revenue: 28050 },
    { year: 2026, month: 2, label: '2月', revenue: 253475 },
    { year: 2026, month: 3, label: '3月', revenue: 99000 },
  ],
};

const DEMO_MEMBERS = {
  totalActiveMembers: 3,
  newMembersThisMonth: 2,
  churnedMembersThisMonth: 0,
  churnRate: 0,
  netGrowth: 2,
  memberHistory: [
    { year: 2025, month: 10, label: '10月', newMembers: 0, churned: 0 },
    { year: 2025, month: 11, label: '11月', newMembers: 0, churned: 0 },
    { year: 2025, month: 12, label: '12月', newMembers: 1, churned: 0 },
    { year: 2026, month: 1, label: '1月', newMembers: 2, churned: 1 },
    { year: 2026, month: 2, label: '2月', newMembers: 5, churned: 4 },
    { year: 2026, month: 3, label: '3月', newMembers: 2, churned: 0 },
  ],
};

const DEMO_PLANS = {
  plans: [
    {
      planId: 'price_premium',
      planName: 'Subscription creation（月額）',
      interval: 'month',
      unitAmount: 49500,
      activeSubscribers: 3,
      monthlyRevenue: 148500,
      percentageOfTotal: 100,
    },
  ],
  totalMonthlyRevenue: 148500,
};

export function useDashboardData(year, month) {
  const [data, setData] = useState({
    summary: null,
    members: null,
    plans: null,
    budgetData: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemo, setIsDemo] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsDemo(false);
    try {
      const [summary, members, plans, budgetData] = await Promise.all([
        fetchSummary(year, month),
        fetchMembers(year, month),
        fetchPlans(),
        fetchBudget(year, month).catch(() => null),
      ]);
      setData({ summary, members, plans, budgetData });
    } catch (err) {
      // Fallback to demo data when API is unavailable
      setData({
        summary: DEMO_SUMMARY,
        members: DEMO_MEMBERS,
        plans: DEMO_PLANS,
        budgetData: null,
      });
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(async () => {
    try {
      await refreshCache();
    } catch (e) {
      // ignore if API unavailable
    }
    await loadData();
  }, [loadData]);

  return { ...data, loading, error, refresh, isDemo };
}
