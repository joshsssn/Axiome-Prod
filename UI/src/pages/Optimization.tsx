import { useState, useCallback, useEffect } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceDot
} from 'recharts';
import { usePortfolio } from '@/context/PortfolioContext';
import { api } from '@/services/api';
import { Target, Zap, Shield, Loader2 } from 'lucide-react';

type OptType = 'maxSharpe' | 'minVol';

interface OptData {
  frontier: { volatility: number; return: number }[];
  current: { volatility: number; return: number };
  minVol: { volatility: number; return: number };
  maxSharpe: { volatility: number; return: number };
  weights: { symbol: string; current: number; minVol: number; maxSharpe: number; diff: number }[];
}

export function Optimization() {
  const { activePortfolio: pf, activePortfolioId } = usePortfolio();
  const [optType, setOptType] = useState<OptType>('maxSharpe');
  const [minWeight, setMinWeight] = useState(0);
  const [maxWeight, setMaxWeight] = useState(25);
  const [loading, setLoading] = useState(false);
  const [optData, setOptData] = useState<OptData | null>(null);

  // Fetch optimization data from backend
  const runOptimization = useCallback(async () => {
    const numId = parseInt(activePortfolioId);
    if (isNaN(numId)) return;
    setLoading(true);
    try {
      const data = await api.portfolios.getOptimizationData(numId);
      if (data && !data.error) {
        setOptData({
          frontier: (data.efficientFrontier ?? []).map((p: any) => ({ volatility: p.risk, return: p.return })),
          current: { volatility: data.currentPortfolio?.risk ?? 0, return: data.currentPortfolio?.return ?? 0 },
          minVol: { volatility: data.minVolPortfolio?.risk ?? 0, return: data.minVolPortfolio?.return ?? 0 },
          maxSharpe: { volatility: data.maxSharpePortfolio?.risk ?? 0, return: data.maxSharpePortfolio?.return ?? 0 },
          weights: (data.weightsTable ?? []).map((w: any) => ({
            symbol: w.symbol, current: w.current, minVol: w.minVol, maxSharpe: w.maxSharpe, diff: w.diff,
          })),
        });
      }
    } catch (e) { console.error('Optimization failed', e); }
    finally { setLoading(false); }
  }, [activePortfolioId]);

  // Auto-fetch on portfolio change if we have positions
  useEffect(() => {
    if (pf && pf.positions.length >= 2) runOptimization();
  }, [activePortfolioId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!pf) return <div className="text-slate-400 p-8">Select a portfolio first.</div>;

  // Use backend data if available, else fall back to mock
  const frontier = optData?.frontier ?? pf.efficientFrontierData;
  const currentPt = optData?.current ?? pf.currentPortfolioPoint;
  const minVolPt = optData?.minVol ?? pf.minVolPoint;
  const maxSharpePt = optData?.maxSharpe ?? pf.maxSharpePoint;
  const weights = optData?.weights ?? pf.optimizedWeights;
  const selectedPoint = optType === 'maxSharpe' ? maxSharpePt : minVolPt;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Portfolio Optimization</h1>
        <p className="text-slate-400 text-sm mt-1">Mean-variance optimization with Ledoit-Wolf shrinkage covariance estimation</p>
      </div>

      {/* Controls */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Optimization Parameters</h2>
        <div className="flex flex-wrap gap-6 items-end">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Objective</label>
            <div className="flex gap-1 bg-slate-900/50 rounded-lg p-0.5">
              <button onClick={() => setOptType('maxSharpe')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-all ${optType === 'maxSharpe' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                <Target className="w-3.5 h-3.5" /> Max Sharpe
              </button>
              <button onClick={() => setOptType('minVol')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-all ${optType === 'minVol' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                <Shield className="w-3.5 h-3.5" /> Min Volatility
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Min Weight (%)</label>
            <input type="number" value={minWeight} onChange={e => setMinWeight(Number(e.target.value))} min={0} max={100}
              className="w-20 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-white px-3 py-2 font-mono focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Max Weight (%)</label>
            <input type="number" value={maxWeight} onChange={e => setMaxWeight(Number(e.target.value))} min={0} max={100}
              className="w-20 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-white px-3 py-2 font-mono focus:outline-none focus:border-blue-500" />
          </div>
          <button onClick={runOptimization} disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />} {loading ? 'Running…' : 'Run Optimization'}
          </button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard label="Expected Return" current={`${currentPt.return}%`} optimized={`${selectedPoint.return}%`} better={optType === 'maxSharpe'} />
        <SummaryCard label="Volatility" current={`${currentPt.volatility}%`} optimized={`${selectedPoint.volatility}%`} better={selectedPoint.volatility < currentPt.volatility} />
        <SummaryCard label="Sharpe Ratio" current={currentPt.volatility > 0 ? (currentPt.return / currentPt.volatility).toFixed(2) : '0'} optimized={selectedPoint.volatility > 0 ? (selectedPoint.return / selectedPoint.volatility).toFixed(2) : '0'} better />
        <SummaryCard label="Constraints" current={`${minWeight}% — ${maxWeight}%`} optimized="Active" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Efficient Frontier */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Efficient Frontier</h2>
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" dataKey="volatility" name="Volatility" stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`}
                label={{ value: 'Volatility (%)', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 11 }} />
              <YAxis type="number" dataKey="return" name="Return" stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`}
                label={{ value: 'Return (%)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number | undefined) => [`${(v ?? 0).toFixed(2)}%`]}
                cursor={{ strokeDasharray: '3 3', stroke: '#475569' }} />
              <Scatter data={frontier} fill="#3b82f6" r={3} />
              <ReferenceDot x={currentPt.volatility} y={currentPt.return} r={8} fill="#f59e0b" stroke="#fbbf24" strokeWidth={2}
                label={{ value: 'Current', position: 'right', fill: '#f59e0b', fontSize: 11 }} />
              <ReferenceDot x={maxSharpePt.volatility} y={maxSharpePt.return} r={8} fill="#10b981" stroke="#34d399" strokeWidth={2}
                label={{ value: 'Max Sharpe', position: 'top', fill: '#10b981', fontSize: 11 }} />
              <ReferenceDot x={minVolPt.volatility} y={minVolPt.return} r={8} fill="#8b5cf6" stroke="#a78bfa" strokeWidth={2}
                label={{ value: 'Min Vol', position: 'top', fill: '#8b5cf6', fontSize: 11 }} />
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-3 text-xs">
            <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500" /> Current</span>
            <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Max Sharpe</span>
            <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-violet-500" /> Min Volatility</span>
          </div>
        </div>

        {/* Weight Changes */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Weight Changes (Current → {optType === 'maxSharpe' ? 'Max Sharpe' : 'Min Vol'})</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={weights} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} />
              <YAxis type="category" dataKey="symbol" stroke="#64748b" tick={{ fontSize: 10 }} width={80} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number | undefined) => [`${(v ?? 0).toFixed(1)}%`]} />
              <Bar dataKey="current" name="Current" fill="#475569" radius={[0, 3, 3, 0]} barSize={8} />
              <Bar dataKey={optType === 'maxSharpe' ? 'maxSharpe' : 'minVol'} name={optType === 'maxSharpe' ? 'Max Sharpe' : 'Min Vol'} radius={[0, 3, 3, 0]} barSize={8}>
                {weights.map((entry: { current: number; maxSharpe: number; minVol: number }, i: number) => {
                  const optimized = optType === 'maxSharpe' ? entry.maxSharpe : entry.minVol;
                  return <Cell key={i} fill={optimized > entry.current ? '#10b981' : '#ef4444'} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weights Table */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-4 border-b border-slate-700/50">
          <h2 className="text-sm font-semibold text-white">Optimized Weight Allocations</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                {['Symbol', 'Current %', 'Min Vol %', 'Max Sharpe %', 'Change (Sel.)'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weights.map((w: { symbol: string; current: number; minVol: number; maxSharpe: number }) => {
                const diff = (optType === 'maxSharpe' ? w.maxSharpe : w.minVol) - w.current;
                return (
                  <tr key={w.symbol} className="border-b border-slate-700/20 hover:bg-slate-700/20">
                    <td className="px-4 py-2.5 font-mono font-semibold text-blue-400">{w.symbol}</td>
                    <td className="px-4 py-2.5 text-slate-300 font-mono">{w.current.toFixed(1)}%</td>
                    <td className="px-4 py-2.5 text-slate-300 font-mono">{w.minVol.toFixed(1)}%</td>
                    <td className="px-4 py-2.5 text-slate-300 font-mono">{w.maxSharpe.toFixed(1)}%</td>
                    <td className={`px-4 py-2.5 font-mono font-medium ${diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, current, optimized, better }: { label: string; current: string; optimized: string; better?: boolean }) {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
      <div className="text-xs text-slate-400 mb-2">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-slate-500 text-xs font-mono line-through">{current}</span>
        <span className="text-lg font-bold text-white">→</span>
        <span className={`text-sm font-bold font-mono ${better ? 'text-emerald-400' : 'text-slate-200'}`}>{optimized}</span>
      </div>
    </div>
  );
}
