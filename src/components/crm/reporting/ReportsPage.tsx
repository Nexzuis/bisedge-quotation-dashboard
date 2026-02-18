import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Users,
  BarChart3,
  Activity,
  Target,
  RefreshCw,
  AlertCircle,
  Trophy,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { CrmTopBar } from '../CrmTopBar';
import { useReportingData } from '../../../hooks/useReportingData';
import { staggerContainer, fadeInUp } from '../shared/motionVariants';
import { formatZAR } from '../../../engine/formatters';
import type {
  FunnelStageData,
  ConversionMetrics,
  SalesRepRow,
  ActivityTypeCount,
  RevenueForecast,
} from '../../../hooks/useReportingData';

// ─── Stage colour lookup (matches stageConfig palette) ────────────────────────

const STAGE_BAR_COLORS: Record<string, string> = {
  lead: 'bg-surface-500',
  contacted: 'bg-blue-500',
  'site-assessment': 'bg-purple-500',
  quoted: 'bg-teal-500',
  negotiation: 'bg-amber-500',
  won: 'bg-green-500',
  lost: 'bg-red-500',
};

const STAGE_TEXT_COLORS: Record<string, string> = {
  lead: 'text-surface-400',
  contacted: 'text-blue-400',
  'site-assessment': 'text-purple-400',
  quoted: 'text-teal-400',
  negotiation: 'text-amber-400',
  won: 'text-green-400',
  lost: 'text-red-400',
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-surface-700/60 rounded-lg ${className ?? ''}`} />
  );
}

function SectionSkeleton() {
  return (
    <div className="glass rounded-xl p-6 space-y-4">
      <SkeletonBlock className="h-5 w-40" />
      <SkeletonBlock className="h-4 w-full" />
      <SkeletonBlock className="h-4 w-5/6" />
      <SkeletonBlock className="h-4 w-3/4" />
      <SkeletonBlock className="h-4 w-4/5" />
    </div>
  );
}

// ─── Pipeline Funnel Chart ────────────────────────────────────────────────────

interface PipelineFunnelProps {
  stages: FunnelStageData[];
}

function PipelineFunnel({ stages }: PipelineFunnelProps) {
  const hasData = stages.some((s) => s.count > 0);

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-lg bg-brand-500/10">
          <BarChart3 className="w-4 h-4 text-brand-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-surface-100">Pipeline Funnel</h2>
          <p className="text-xs text-surface-500">Companies by stage — count and estimated value</p>
        </div>
      </div>

      {!hasData ? (
        <div className="flex items-center justify-center h-32 text-surface-500 text-sm">
          No pipeline data yet. Add companies to see the funnel.
        </div>
      ) : (
        <div className="space-y-2">
          {stages.map((stage, i) => (
            <motion.div
              key={stage.stage}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35, ease: 'easeOut' }}
              className="grid grid-cols-[7rem_1fr_auto] items-center gap-3"
            >
              {/* Label */}
              <span className={`text-xs font-medium truncate ${STAGE_TEXT_COLORS[stage.stage] ?? 'text-surface-400'}`}>
                {stage.label}
              </span>

              {/* Bar track */}
              <div className="relative h-6 bg-surface-700/50 rounded overflow-hidden">
                <motion.div
                  className={`absolute inset-y-0 left-0 rounded ${STAGE_BAR_COLORS[stage.stage] ?? 'bg-surface-500'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${stage.pct}%` }}
                  transition={{ delay: i * 0.05 + 0.1, duration: 0.5, ease: 'easeOut' }}
                />
                {/* Count label inside bar */}
                {stage.count > 0 && (
                  <span className="absolute inset-0 flex items-center pl-2 text-xs font-semibold text-white/90 pointer-events-none">
                    {stage.count}
                  </span>
                )}
              </div>

              {/* Value */}
              <span className="text-xs font-medium text-surface-300 tabular-nums whitespace-nowrap">
                {stage.value > 0 ? formatZAR(stage.value, false) : '—'}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Conversion Metrics Card ──────────────────────────────────────────────────

interface ConversionCardProps {
  metrics: ConversionMetrics;
}

function ConversionCard({ metrics }: ConversionCardProps) {
  const maxWins = Math.max(1, ...metrics.monthlyWins.map((m) => m.wins));

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-lg bg-green-500/10">
          <TrendingUp className="w-4 h-4 text-green-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-surface-100">Conversion Rates</h2>
          <p className="text-xs text-surface-500">Win rates and pipeline velocity</p>
        </div>
      </div>

      {/* KPI trio */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Lead-to-Won rate */}
        <div className="bg-surface-800/60 rounded-xl p-4 border border-surface-700/40">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs text-surface-400">Lead-to-Won Rate</span>
          </div>
          <div className="text-2xl font-bold text-surface-100">
            {metrics.leadToWonRate.toFixed(1)}
            <span className="text-sm font-normal text-surface-400 ml-0.5">%</span>
          </div>
          <div className="text-xs text-surface-500 mt-1">
            {metrics.totalWon} won / {metrics.totalCompanies} total
          </div>
          {/* Radial progress ring — CSS only */}
          <div className="mt-3">
            <div className="w-full h-1.5 bg-surface-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-green-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, metrics.leadToWonRate)}%` }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>

        {/* Avg days in pipeline */}
        <div className="bg-surface-800/60 rounded-xl p-4 border border-surface-700/40">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs text-surface-400">Avg Days to Win</span>
          </div>
          <div className="text-2xl font-bold text-surface-100">
            {metrics.avgDaysInPipeline > 0 ? metrics.avgDaysInPipeline : '—'}
            {metrics.avgDaysInPipeline > 0 && (
              <span className="text-sm font-normal text-surface-400 ml-0.5">d</span>
            )}
          </div>
          <div className="text-xs text-surface-500 mt-1">
            {metrics.avgDaysInPipeline > 0
              ? 'From lead creation to closed-won'
              : 'No won deals with tracked dates'}
          </div>
        </div>
      </div>

      {/* Monthly win trend — mini bar chart */}
      <div>
        <div className="text-xs font-medium text-surface-400 mb-3">
          Monthly Win Trend — Last 6 Months
        </div>
        <div className="flex items-end gap-2 h-20">
          {metrics.monthlyWins.map((m, i) => {
            const barH = maxWins > 0 ? (m.wins / maxWins) * 100 : 0;
            return (
              <div key={`${m.year}-${m.month}`} className="flex-1 flex flex-col items-center gap-1">
                <div className="relative w-full flex items-end justify-center h-14">
                  <motion.div
                    className="w-full rounded-t bg-brand-500/70 hover:bg-brand-500 transition-colors duration-200"
                    style={{ minHeight: m.wins > 0 ? 4 : 2 }}
                    initial={{ height: 0 }}
                    animate={{ height: `${barH}%` }}
                    transition={{ delay: i * 0.07, duration: 0.45, ease: 'easeOut' }}
                    title={`${m.month} ${m.year}: ${m.wins} won`}
                  />
                </div>
                <span className="text-2xs text-surface-500">{m.month}</span>
                {m.wins > 0 && (
                  <span className="text-2xs font-semibold text-brand-400">{m.wins}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Sales Rep Performance Table ──────────────────────────────────────────────

interface SalesRepTableProps {
  rows: SalesRepRow[];
}

function SalesRepTable({ rows }: SalesRepTableProps) {
  const ROLE_LABELS: Record<string, string> = {
    sales_rep: 'Sales Rep',
    key_account: 'Key Account',
  };

  if (rows.length === 0) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-surface-100">Sales Rep Performance</h2>
            <p className="text-xs text-surface-500">No active sales reps found</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-20 text-surface-500 text-sm">
          No users with role 'sales_rep' or 'key_account' found.
        </div>
      </div>
    );
  }

  // Sort by pipeline value descending
  const sorted = [...rows].sort((a, b) => b.pipelineValue - a.pipelineValue);

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-lg bg-blue-500/10">
          <Users className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-surface-100">Sales Rep Performance</h2>
          <p className="text-xs text-surface-500">Pipeline, wins, and activity by team member</p>
        </div>
      </div>

      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-surface-700/40">
              <th className="text-left text-xs font-medium text-surface-400 px-2 py-2">Rep</th>
              <th className="text-right text-xs font-medium text-surface-400 px-2 py-2">Assigned</th>
              <th className="text-right text-xs font-medium text-surface-400 px-2 py-2">Pipeline Value</th>
              <th className="text-right text-xs font-medium text-surface-400 px-2 py-2">Won</th>
              <th className="text-right text-xs font-medium text-surface-400 px-2 py-2">Won Value</th>
              <th className="text-right text-xs font-medium text-surface-400 px-2 py-2">Activities (30d)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <motion.tr
                key={row.userId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className="border-b border-surface-700/20 hover:bg-surface-700/20 transition-colors"
              >
                <td className="px-2 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-brand-600/30 border border-brand-500/30 flex items-center justify-center text-xs font-semibold text-brand-300">
                      {row.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-surface-100">{row.fullName}</div>
                      <div className="text-xs text-surface-500">{ROLE_LABELS[row.role] ?? row.role}</div>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-3 text-right">
                  <span className="text-sm font-medium text-surface-200">{row.totalAssigned}</span>
                </td>
                <td className="px-2 py-3 text-right">
                  <span className="text-sm font-medium text-teal-300">
                    {row.pipelineValue > 0 ? formatZAR(row.pipelineValue, false) : '—'}
                  </span>
                </td>
                <td className="px-2 py-3 text-right">
                  <span className={`inline-flex items-center justify-center min-w-[1.5rem] h-5 rounded text-xs font-semibold px-1.5 ${
                    row.wonCount > 0
                      ? 'bg-green-500/15 text-green-400 border border-green-500/25'
                      : 'text-surface-500'
                  }`}>
                    {row.wonCount}
                  </span>
                </td>
                <td className="px-2 py-3 text-right">
                  <span className="text-sm font-medium text-green-300">
                    {row.wonValue > 0 ? formatZAR(row.wonValue, false) : '—'}
                  </span>
                </td>
                <td className="px-2 py-3 text-right">
                  <span className={`inline-flex items-center justify-center min-w-[1.5rem] h-5 rounded text-xs font-semibold px-1.5 ${
                    row.activitiesThisMonth > 0
                      ? 'bg-brand-500/15 text-brand-400 border border-brand-500/25'
                      : 'text-surface-500'
                  }`}>
                    {row.activitiesThisMonth}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Activity Summary Chart ───────────────────────────────────────────────────

interface ActivitySummaryProps {
  items: ActivityTypeCount[];
}

function ActivitySummary({ items }: ActivitySummaryProps) {
  const hasData = items.some((a) => a.count > 0);

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-lg bg-purple-500/10">
          <Activity className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-surface-100">Activity Summary</h2>
          <p className="text-xs text-surface-500">All interaction types — last 30 days</p>
        </div>
      </div>

      {!hasData ? (
        <div className="flex items-center justify-center h-28 text-surface-500 text-sm">
          No activities logged in the last 30 days.
        </div>
      ) : (
        <div className="space-y-2.5">
          {items
            .filter((a) => a.count > 0)
            .sort((a, b) => b.count - a.count)
            .map((item, i) => (
              <motion.div
                key={item.type}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="grid grid-cols-[8rem_1fr_2rem] items-center gap-3"
              >
                <span className="text-xs font-medium text-surface-300 truncate">{item.label}</span>
                <div className="relative h-5 bg-surface-700/50 rounded overflow-hidden">
                  <motion.div
                    className={`absolute inset-y-0 left-0 rounded ${item.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.pct}%` }}
                    transition={{ delay: i * 0.05 + 0.1, duration: 0.5, ease: 'easeOut' }}
                    style={{ opacity: 0.8 }}
                  />
                </div>
                <span className="text-xs font-semibold text-surface-200 text-right tabular-nums">
                  {item.count}
                </span>
              </motion.div>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── Revenue Forecast ─────────────────────────────────────────────────────────

interface RevenueForecastCardProps {
  forecast: RevenueForecast;
}

function RevenueForecastCard({ forecast }: RevenueForecastCardProps) {
  const hasData = forecast.negotiationCount > 0 || forecast.quotedCount > 0;

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-lg bg-amber-500/10">
          <Target className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-surface-100">Revenue Forecast</h2>
          <p className="text-xs text-surface-500">Probability-weighted pipeline value</p>
        </div>
      </div>

      {!hasData ? (
        <div className="flex items-center justify-center h-28 text-surface-500 text-sm">
          No companies in Quoted or Negotiation stage.
        </div>
      ) : (
        <>
          {/* Big weighted total */}
          <div className="text-center mb-6">
            <div className="text-xs text-surface-400 mb-1">Weighted Forecast Total</div>
            <div className="text-3xl font-bold text-amber-300">
              {formatZAR(forecast.weightedTotal, false)}
            </div>
            <div className="text-xs text-surface-500 mt-1">
              Based on stage probability weights
            </div>
          </div>

          {/* Breakdown cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Negotiation */}
            <div className="bg-surface-800/60 rounded-xl p-4 border border-amber-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-amber-400">Negotiation</span>
                <span className="text-xs text-surface-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  60% prob.
                </span>
              </div>
              <div className="text-lg font-bold text-surface-100">
                {formatZAR(forecast.negotiationValue, false)}
              </div>
              <div className="text-xs text-surface-500 mt-0.5">
                {forecast.negotiationCount} {forecast.negotiationCount === 1 ? 'company' : 'companies'}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-300">
                <ArrowRight className="w-3 h-3" />
                <span>{formatZAR(forecast.negotiationValue * 0.6, false)}</span>
              </div>
            </div>

            {/* Quoted */}
            <div className="bg-surface-800/60 rounded-xl p-4 border border-teal-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-teal-400">Quoted</span>
                <span className="text-xs text-surface-500 bg-teal-500/10 px-2 py-0.5 rounded-full">
                  40% prob.
                </span>
              </div>
              <div className="text-lg font-bold text-surface-100">
                {formatZAR(forecast.quotedValue, false)}
              </div>
              <div className="text-xs text-surface-500 mt-0.5">
                {forecast.quotedCount} {forecast.quotedCount === 1 ? 'company' : 'companies'}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-teal-300">
                <ArrowRight className="w-3 h-3" />
                <span>{formatZAR(forecast.quotedValue * 0.4, false)}</span>
              </div>
            </div>
          </div>

          {/* Visual weight bar */}
          <div className="mt-4">
            <div className="flex justify-between text-2xs text-surface-500 mb-1">
              <span>Negotiation weight</span>
              <span>Quoted weight</span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden">
              {forecast.negotiationValue + forecast.quotedValue > 0 && (
                <>
                  <motion.div
                    className="bg-amber-500"
                    initial={{ flex: 0 }}
                    animate={{
                      flex: forecast.negotiationValue * 0.6,
                    }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                  <motion.div
                    className="bg-teal-500"
                    initial={{ flex: 0 }}
                    animate={{
                      flex: forecast.quotedValue * 0.4,
                    }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900 flex items-center justify-center p-8">
      <div className="glass rounded-xl p-8 max-w-md w-full text-center space-y-4">
        <div className="flex items-center justify-center">
          <div className="p-3 rounded-full bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
        </div>
        <div>
          <div className="text-base font-semibold text-red-400 mb-1">Failed to load reports</div>
          <p className="text-sm text-surface-400">{message}</p>
        </div>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors duration-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { data, loading, error, refresh } = useReportingData();

  // Trigger initial data load on mount
  useEffect(() => {
    refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return <ErrorState message={error} onRetry={refresh} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900">
      <motion.div
        className="max-w-7xl mx-auto p-4 space-y-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Top navigation bar */}
        <motion.div variants={fadeInUp}>
          <CrmTopBar />
        </motion.div>

        {/* Page header */}
        <motion.div variants={fadeInUp} className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-surface-100 flex items-center gap-2.5">
              <BarChart3 className="w-5 h-5 text-brand-400" />
              Reporting &amp; Analytics
            </h1>
            <p className="text-sm text-surface-400 mt-0.5">
              Pipeline performance, conversion rates, and revenue forecasting
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:text-surface-100 bg-surface-800/50 hover:bg-surface-700/50 border border-surface-700/40 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </motion.div>

        {/* Row 1 — Pipeline Funnel + Conversion Rates */}
        <motion.div variants={fadeInUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {loading || !data ? (
            <>
              <SectionSkeleton />
              <SectionSkeleton />
            </>
          ) : (
            <>
              <PipelineFunnel stages={data.funnel} />
              <ConversionCard metrics={data.conversion} />
            </>
          )}
        </motion.div>

        {/* Row 2 — Sales Rep Performance Table (full width) */}
        <motion.div variants={fadeInUp}>
          {loading || !data ? (
            <div className="glass rounded-xl p-6 space-y-4">
              <SkeletonBlock className="h-5 w-56" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonBlock key={i} className="h-10 w-full" />
                ))}
              </div>
            </div>
          ) : (
            <SalesRepTable rows={data.salesReps} />
          )}
        </motion.div>

        {/* Row 3 — Activity Summary + Revenue Forecast */}
        <motion.div variants={fadeInUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {loading || !data ? (
            <>
              <SectionSkeleton />
              <SectionSkeleton />
            </>
          ) : (
            <>
              <ActivitySummary items={data.activitySummary} />
              <RevenueForecastCard forecast={data.forecast} />
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
