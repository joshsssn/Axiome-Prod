import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Search, Filter } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { usePortfolio } from '@/context/PortfolioContext';
import type { AllocationItem, Position } from '@/data/mockData';

type AllocView = 'class' | 'sector' | 'country';

export function Portfolio() {
  const { activePortfolio: pf } = usePortfolio();
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [allocView, setAllocView] = useState<AllocView>('class');

  if (!pf) return <div className="text-slate-400 p-8">Select a portfolio first.</div>;

  const currSym = pf.summary.currency === 'EUR' ? '€' : '$';
  const fmt = (n: number) => `${currSym}${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const assetClasses = ['All', ...new Set(pf.positions.map((p: Position) => p.assetClass))];
  const filtered = pf.positions.filter((p: Position) =>
    (classFilter === 'All' || p.assetClass === classFilter) &&
    (p.symbol.toLowerCase().includes(search.toLowerCase()) || p.name.toLowerCase().includes(search.toLowerCase()))
  );

  const allocData: AllocationItem[] = allocView === 'class' ? pf.allocationByClass : allocView === 'sector' ? pf.allocationBySector : pf.allocationByCountry;

  const topMovers = [...pf.positions].sort((a: Position, b: Position) => Math.abs(b.dailyChange) - Math.abs(a.dailyChange)).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Portfolio Positions</h1>
        <p className="text-slate-400 text-sm mt-1">Manage holdings and view allocation breakdowns</p>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Allocation Pie */}
        <div className="xl:col-span-2 bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Allocation Breakdown</h2>
            <div className="flex gap-1 bg-slate-900/50 rounded-lg p-0.5">
              {(['class', 'sector', 'country'] as AllocView[]).map(v => (
                <button key={v} onClick={() => setAllocView(v)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${allocView === v ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                  {v === 'class' ? 'Asset Class' : v === 'sector' ? 'Sector' : 'Country'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-8">
            <ResponsiveContainer width="50%" height={220}>
              <PieChart>
                <Pie data={allocData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={2} dataKey="value">
                  {allocData.map((entry: AllocationItem, i: number) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number | undefined) => [`${v ?? 0}%`]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {allocData.map((a: AllocationItem) => (
                <div key={a.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                    <span className="text-slate-300">{a.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${a.value}%`, backgroundColor: a.color }} />
                    </div>
                    <span className="text-slate-400 font-mono w-10 text-right">{a.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Daily Movers */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Top Daily Movers</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topMovers} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} />
              <YAxis type="category" dataKey="symbol" stroke="#64748b" tick={{ fontSize: 11 }} width={60} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number | undefined) => [`${(v ?? 0).toFixed(2)}%`, 'Change']} />
              <Bar dataKey="dailyChange" radius={[0, 4, 4, 0]}>
                {topMovers.map((entry: Position, i: number) => (
                  <Cell key={i} fill={entry.dailyChange >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Positions Table */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-4 border-b border-slate-700/50 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search positions..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-1">
              <Filter className="w-4 h-4 text-slate-500" />
              <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
                className="bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-white px-2 py-2 focus:outline-none focus:border-blue-500">
                {assetClasses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <span className="text-xs text-slate-500">{filtered.length} positions</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                {['Symbol', 'Name', 'Class', 'Sector', 'Qty', 'Entry', 'Current', 'Weight', 'P&L', 'P&L %', 'Daily', 'Mode'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p: Position) => (
                <tr key={p.id} className="border-b border-slate-700/20 hover:bg-slate-700/20 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-400">{p.symbol}</td>
                  <td className="px-4 py-3 text-slate-300 max-w-[180px] truncate">{p.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300">{p.assetClass}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{p.sector}</td>
                  <td className="px-4 py-3 text-slate-300 font-mono">{p.quantity.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono">{fmt(p.entryPrice)}</td>
                  <td className="px-4 py-3 text-slate-200 font-mono">{fmt(p.currentPrice)}</td>
                  <td className="px-4 py-3 text-slate-300 font-mono">{p.weight}%</td>
                  <td className={`px-4 py-3 font-mono ${p.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{p.pnl >= 0 ? '' : '-'}{fmt(Math.abs(p.pnl))}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-0.5 font-mono ${p.pnlPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {p.pnlPercent >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(p.pnlPercent).toFixed(2)}%
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-mono text-xs ${p.dailyChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {p.dailyChange >= 0 ? '+' : ''}{p.dailyChange.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${p.pricingMode === 'market' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}`}>
                      {p.pricingMode}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
