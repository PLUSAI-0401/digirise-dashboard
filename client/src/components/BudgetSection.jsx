import React from 'react';
import BudgetKPICard from './BudgetKPICard';
import FunnelChart from './FunnelChart';
import BudgetTimelineChart from './BudgetTimelineChart';
import { TrendingUp, Users, MessageCircle, Target } from 'lucide-react';

export default function BudgetSection({ budget, timeline, lineMetrics, actualRevenue, actualNewMembers, year, month }) {
  if (!budget) {
    return (
      <div className="budget-no-data">
        <p>{year}年{month}月の予算データはありません。</p>
        <p style={{ fontSize: 12, color: '#9CA3AF' }}>予算データは2026年2月～2027年1月の期間が対象です。</p>
      </div>
    );
  }

  const actualLineNew = lineMetrics ? lineMetrics.newFollowers : 0;
  const hasLineData = lineMetrics !== null && lineMetrics !== undefined;

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
          title="LINE新規登録数"
          budget={budget.lineRegistrations}
          actual={actualLineNew}
          unit="number"
          description={hasLineData ? 'LINE API連携中' : '予算のみ表示'}
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

      {/* LINE Follower Summary */}
      {hasLineData && (
        <div className="line-summary-card">
          <div className="line-summary-header">
            <MessageCircle size={18} color="#06B6D4" />
            <span className="line-summary-title">LINEフォロワー概況</span>
          </div>
          <div className="line-summary-grid">
            <div className="line-summary-item">
              <div className="line-summary-label">総フォロワー数</div>
              <div className="line-summary-value">{lineMetrics.totalFollowers.toLocaleString()}人</div>
            </div>
            <div className="line-summary-item">
              <div className="line-summary-label">有効リーチ</div>
              <div className="line-summary-value highlight">{lineMetrics.targetedReaches.toLocaleString()}人</div>
            </div>
            <div className="line-summary-item">
              <div className="line-summary-label">ブロック数</div>
              <div className="line-summary-value muted">{lineMetrics.blocks.toLocaleString()}人</div>
            </div>
            <div className="line-summary-item">
              <div className="line-summary-label">今月の新規登録</div>
              <div className="line-summary-value accent">{lineMetrics.newFollowers.toLocaleString()}人</div>
            </div>
          </div>
        </div>
      )}

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
