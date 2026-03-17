import React from 'react';
import BudgetKPICard from './BudgetKPICard';
import FunnelChart from './FunnelChart';
import BudgetTimelineChart from './BudgetTimelineChart';
import { TrendingUp, Users, MessageCircle, Target } from 'lucide-react';

export default function BudgetSection({ budget, timeline, actualRevenue, actualNewMembers, year, month }) {
  if (!budget) {
    return (
      <div className="budget-no-data">
        <p>{year}年{month}月の予算データはありません。</p>
        <p style={{ fontSize: 12, color: '#9CA3AF' }}>予算データは2026年2月～2027年1月の期間が対象です。</p>
      </div>
    );
  }

  return (
    <>
      <div className="budget-kpi-grid">
        <BudgetKPICard
          title="売上高"
          budget={budget.revenue.total}
          actual={actualRevenue || 0}
          unit="currency"
          description="月間売上目標"
          icon={<TrendingUp size={20} color="#4F46E5" />}
        />
        <BudgetKPICard
          title="新規獲得ユーザー数"
          budget={budget.newUsers.total}
          actual={actualNewMembers || 0}
          unit="number"
          description="月間入会目標"
          icon={<Users size={20} color="#10B981" />}
        />
        <BudgetKPICard
          title="LINE登録数"
          budget={budget.lineRegistrations}
          actual={0}
          unit="number"
          description="予算のみ表示"
          icon={<MessageCircle size={20} color="#06B6D4" />}
        />
        <BudgetKPICard
          title="CV（広告経由入会）"
          budget={budget.funnel.conversions}
          actual={0}
          unit="number"
          description="予算のみ表示"
          icon={<Target size={20} color="#F59E0B" />}
        />
      </div>

      <div className="charts-grid">
        <BudgetTimelineChart timeline={timeline} type="revenue" />
        <BudgetTimelineChart timeline={timeline} type="line" />
      </div>

      <div className="budget-funnel-wrapper">
        <FunnelChart funnel={budget.funnel} />
        <div className="chart-card">
          <div className="chart-card-title">ARPU（顧客単価）</div>
          <div className="arpu-grid">
            {budget.arpu.plan1month > 0 && (
              <div className="arpu-item">
                <div className="arpu-plan-name">1ヶ月プラン</div>
                <div className="arpu-value">¥{budget.arpu.plan1month.toLocaleString()}</div>
              </div>
            )}
            <div className="arpu-item">
              <div className="arpu-plan-name">3ヶ月プラン</div>
              <div className="arpu-value">¥{budget.arpu.plan3month.toLocaleString()}</div>
            </div>
            <div className="arpu-item">
              <div className="arpu-plan-name">5ヶ月プラン</div>
              <div className="arpu-value">¥{budget.arpu.plan5month.toLocaleString()}</div>
            </div>
          </div>

          <div className="chart-card-title" style={{ marginTop: 24 }}>新規ユーザー内訳（目標）</div>
          <table className="plan-table" style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th>プラン</th>
                <th>広告経由</th>
                <th>Organic</th>
                <th>合計</th>
              </tr>
            </thead>
            <tbody>
              {budget.arpu.plan1month > 0 && (
                <tr>
                  <td>1ヶ月プラン</td>
                  <td>{budget.newUsers.plan1month_ad}人</td>
                  <td>{budget.newUsers.plan1month_organic}人</td>
                  <td style={{ fontWeight: 600 }}>{budget.newUsers.plan1month_ad + budget.newUsers.plan1month_organic}人</td>
                </tr>
              )}
              <tr>
                <td>3ヶ月プラン</td>
                <td>{budget.newUsers.plan3month_ad}人</td>
                <td>{budget.newUsers.plan3month_organic}人</td>
                <td style={{ fontWeight: 600 }}>{budget.newUsers.plan3month_ad + budget.newUsers.plan3month_organic}人</td>
              </tr>
              <tr>
                <td>5ヶ月プラン</td>
                <td>{budget.newUsers.plan5month_ad}人</td>
                <td>{budget.newUsers.plan5month_organic}人</td>
                <td style={{ fontWeight: 600 }}>{budget.newUsers.plan5month_ad + budget.newUsers.plan5month_organic}人</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>合計</td>
                <td>{budget.newUsers.plan1month_ad + budget.newUsers.plan3month_ad + budget.newUsers.plan5month_ad}人</td>
                <td>{budget.newUsers.plan1month_organic + budget.newUsers.plan3month_organic + budget.newUsers.plan5month_organic}人</td>
                <td style={{ fontWeight: 700 }}>{budget.newUsers.total}人</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}
