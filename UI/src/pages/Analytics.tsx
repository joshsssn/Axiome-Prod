import { useState } from 'react';
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, AreaChart, Area, ComposedChart
} from 'recharts';
import { usePortfolio } from '@/context/PortfolioContext';

type TimeRange = '6M' | '1Y' | '2Y';

export function Analytics() {
  const { activePortfolio: pf } = usePortfolio();
  const [range, setRange] = useState<TimeRange>('2Y');
  if (!pf) return <div className="text-slate-400 p-8">Select a portfolio first.</div>;
  const rangeSlice = range === '6M' ? -126 : range === '1Y' ? -252 : undefined;
  const chartData = (rangeSlice ? pf.performanceData.slice(rangeSlice) : pf.performanceData).filter((_: unknown, i: number) => i % 2 === 0);
  const ddData = (rangeSlice ? pf.drawdownData.slice(rangeSlice) : pf.drawdownData).filter((_: unknown, i: number) => i % 2 === 0);
  const rvData = rangeSlice ? pf.rollingVolatility.slice(Math.floor(rangeSlice / 5)) : pf.rollingVolatility;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Performance Analytics</h1>
          <p className="text-slate-400 text-sm mt-1">Detailed return analysis and benchmark comparison</p>
        </div>
        <div className="flex gap-1 bg-slate-800/50 border border-slate-700/50 rounded-lg p-0.5">
          {(['6M', '1Y', '2Y'] as TimeRange[]).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${range === r ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Cumulative Return */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Cumulative Return (%) — Portfolio vs Benchmark</h2>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="gradPort" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} interval={Math.floor(chartData.length / 8)} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#94a3b8' }} formatter={(v: number | undefined) => [`${(v ?? 0).toFixed(2)}%`]} />
            <Area type="monotone" dataKey="portfolioReturn" name="Portfolio" stroke="#3b82f6" strokeWidth={2} fill="url(#gradPort)" />
            <Line type="monotone" dataKey="benchmarkReturn" name="Benchmark" stroke="#6b7280" strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Monthly Returns */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Monthly Returns (%)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={pf.monthlyReturns} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number | undefined) => [`${(v ?? 0).toFixed(2)}%`]} />
              <Bar dataKey="portfolio" name="Portfolio" radius={[3, 3, 0, 0]}>
                {pf.monthlyReturns.map((entry: { portfolio: number }, i: number) => (
                  <Cell key={i} fill={entry.portfolio >= 0 ? '#3b82f6' : '#ef4444'} />
                ))}
              </Bar>
              <Bar dataKey="benchmark" name="Benchmark" fill="#4b5563" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Return Distribution */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Return Distribution</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={pf.returnDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="bin" stroke="#64748b" tick={{ fontSize: 9 }} interval={4} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="frequency" name="Frequency" fill="#6366f1" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-3 text-xs text-slate-400">
            <span>Skewness: <span className="text-white font-mono">{pf.riskMetrics.skewness}</span></span>
            <span>Kurtosis: <span className="text-white font-mono">{pf.riskMetrics.kurtosis}</span></span>
            <span>Best Day: <span className="text-emerald-400 font-mono">+{pf.riskMetrics.bestDay}%</span></span>
            <span>Worst Day: <span className="text-red-400 font-mono">{pf.riskMetrics.worstDay}%</span></span>
          </div>
        </div>

        {/* Drawdown */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Drawdown Analysis</h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={ddData}>
              <defs>
                <linearGradient id="gradDD" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} interval={Math.floor(ddData.length / 6)} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number | undefined) => [`${(v ?? 0).toFixed(2)}%`]} />
              <Area type="monotone" dataKey="drawdown" name="Drawdown" stroke="#ef4444" strokeWidth={1.5} fill="url(#gradDD)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-3 text-xs text-slate-400">
            <span>Max Drawdown: <span className="text-red-400 font-mono">{pf.riskMetrics.maxDrawdown}%</span></span>
            <span>Duration: <span className="text-white font-mono">{pf.riskMetrics.maxDrawdownDuration} days</span></span>
          </div>
        </div>

        {/* Rolling Volatility */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Rolling 60-Day Volatility (%)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={rvData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} interval={Math.floor(rvData.length / 6)} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number | undefined) => [`${(v ?? 0).toFixed(2)}%`]} />
              <Line type="monotone" dataKey="portfolio" name="Portfolio Vol" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="benchmark" name="Benchmark Vol" stroke="#6b7280" strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
