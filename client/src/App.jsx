import React, { useState } from 'react';
import { useDashboardData } from './hooks/useDashboardData';
import Header from './components/Header';
import DateRangePicker from './components/DateRangePicker';
import KPIGrid from './components/KPIGrid';
import RevenueChart from './components/RevenueChart';
import MemberChart from './components/MemberChart';
import NewMembersByPlanCard from './components/NewMembersByPlanCard';
import PlanPieChart from './components/PlanPieChart';
import PlanBreakdownTable from './components/PlanBreakdownTable';
import MemberListTable from './components/MemberListTable';
import BudgetSection from './components/BudgetSection';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';

export default function App() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { summary, members, plans, budgetData, memberList, weeklyMembers, loading, error, refresh, isDemo } = useDashboardData(year, month);

  return (
    <div>
      <Header onRefresh={refresh} loading={loading} />

      <main className="dashboard">
        {isDemo && (
          <div style={{
            background: '#FEF3C7',
            border: '1px solid #F59E0B',
            borderRadius: 8,
            padding: '12px 20px',
            marginBottom: 16,
            fontSize: 13,
            color: '#92400E',
          }}>
            デモモード: バックエンドサーバーに接続できないため、サンプルデータを表示しています。
            .envファイルにStripe APIキーを設定し、サーバーを起動してください。
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            {year}年{month}月のダッシュボード
          </h2>
          <DateRangePicker
            year={year}
            month={month}
            onYearChange={setYear}
            onMonthChange={setMonth}
          />
        </div>

        <div style={{
          fontSize: 12,
          color: '#6B7280',
          marginBottom: 20,
          padding: '8px 12px',
          background: '#F9FAFB',
          borderLeft: '3px solid #4F46E5',
          borderRadius: 4,
        }}>
          ※ 売上・MRR等の金額は全て<strong>税抜</strong>表示です（Stripe決済の税込金額から消費税10%を控除）。会員数は永続無料(100%off forever)を除外した有料契約者数です。
        </div>

        {loading && <LoadingSpinner />}
        {error && <ErrorMessage message={error} />}

        {!loading && !error && summary && members && (
          <>
            <KPIGrid summary={summary} members={members} plans={plans} />

            <div className="section-title">売上・会員推移</div>
            <div className="charts-grid">
              <RevenueChart revenueHistory={summary?.revenueHistory} />
              <MemberChart memberHistory={members?.memberHistory} weeklyMembers={weeklyMembers} />
            </div>

            <div className="section-title">{year}年{month}月 新規入会内訳</div>
            <NewMembersByPlanCard
              newByPlan={members?.newByPlan}
              activeByPlan={members?.activeByPlan}
              newRevenueByPlan={members?.newRevenueByPlan}
              newTotal={members?.newMembersThisMonth || 0}
              year={year}
              month={month}
            />

            <div className="section-title">会員一覧</div>
            <MemberListTable memberList={memberList} />

            <div className="section-title" style={{ marginTop: 24 }}>プラン別分析</div>
            <div className="plan-section">
              <PlanPieChart plans={plans?.plans} />
              <PlanBreakdownTable
                plans={plans?.plans}
                totalMonthlyRevenue={plans?.totalMonthlyRevenue}
              />
            </div>

            <div className="budget-divider">
              <span className="budget-divider-text">予実管理</span>
            </div>

            <div className="section-title">トップラインKPI（予算 vs 実績）</div>
            <BudgetSection
              budget={budgetData?.budget}
              timeline={budgetData?.timeline}
              lineMetrics={budgetData?.lineMetrics}
              overrides={budgetData?.overrides}
              actualRevenue={summary?.currentMonth?.revenue}
              actualNewMembers={members?.newMembersThisMonth}
              year={year}
              month={month}
            />
          </>
        )}
      </main>
    </div>
  );
}
