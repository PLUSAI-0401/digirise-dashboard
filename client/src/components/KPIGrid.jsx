import React from 'react';
import KPICard from './KPICard';
import { formatCurrency, formatNumber } from '../utils/formatters';
import {
  TrendingUp,
  ArrowUpDown,
  Repeat,
  Wallet,
  Users,
  UserPlus,
  UserMinus,
  PercentCircle,
} from 'lucide-react';

export default function KPIGrid({ summary, members }) {
  if (!summary || !members) return null;

  const cards = [
    {
      title: '月間売上',
      value: formatCurrency(summary.currentMonth.revenue),
      subtitle: `${summary.currentMonth.transactionCount}件の取引`,
      icon: TrendingUp,
      iconColor: 'primary',
    },
    {
      title: '前月比',
      value: `${summary.monthOverMonth.percentage >= 0 ? '+' : ''}${summary.monthOverMonth.percentage}%`,
      subtitle: `${summary.monthOverMonth.absolute >= 0 ? '+' : ''}${formatCurrency(summary.monthOverMonth.absolute)}`,
      trend: summary.monthOverMonth.percentage,
      icon: ArrowUpDown,
      iconColor: summary.monthOverMonth.percentage >= 0 ? 'success' : 'danger',
    },
    {
      title: 'MRR（月次経常収益）',
      value: formatCurrency(summary.mrr),
      subtitle: '現在のアクティブサブスク',
      icon: Repeat,
      iconColor: 'primary',
    },
    {
      title: '累計売上',
      value: formatCurrency(summary.cumulativeRevenue),
      subtitle: 'サービス開始からの合計',
      icon: Wallet,
      iconColor: 'warning',
    },
    {
      title: 'アクティブ会員数',
      value: formatNumber(members.totalActiveMembers),
      subtitle: '名',
      icon: Users,
      iconColor: 'primary',
    },
    {
      title: '今月の新規入会',
      value: formatNumber(members.newMembersThisMonth),
      subtitle: '名',
      icon: UserPlus,
      iconColor: 'success',
    },
    {
      title: '今月の解約数',
      value: formatNumber(members.churnedMembersThisMonth),
      subtitle: '名',
      icon: UserMinus,
      iconColor: 'danger',
    },
    {
      title: '解約率',
      value: `${members.churnRate}%`,
      subtitle: '月初会員に対する比率',
      icon: PercentCircle,
      iconColor: members.churnRate > 5 ? 'danger' : 'success',
    },
  ];

  return (
    <div className="kpi-grid">
      {cards.map((card, i) => (
        <KPICard key={i} {...card} />
      ))}
    </div>
  );
}
