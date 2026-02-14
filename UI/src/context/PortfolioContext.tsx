import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import {
  defaultPortfolios,
  type PortfolioData,
  type Position,
  type Transaction,
  type Collaborator,
  type StressScenario,
  type RiskMetricsData,
} from '@/data/mockData';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

/* ────────────────────────────────────────────────── Types */
interface PortfolioContextType {
  portfolios: PortfolioData[];
  activePortfolio: PortfolioData | null;
  activePortfolioId: string;
  setActivePortfolioId: (id: string) => void;
  createPortfolio: (cfg: { name: string; description: string; currency: 'USD' | 'EUR'; benchmark: string }) => void;
  deletePortfolio: (id: string) => void;
  addPosition: (pos: Omit<Position, 'id' | 'pnl' | 'pnlPercent' | 'dailyChange' | 'weight'>) => void;
  removePosition: (posId: number) => void;
  updatePosition: (posId: number, updates: Partial<Position>) => void;
  updatePortfolioMeta: (updates: { name?: string; description?: string; benchmark?: string }) => void;
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  removeTransaction: (txId: number) => void;
  addCollaborator: (collab: Omit<Collaborator, 'id'>) => void;
  removeCollaborator: (collabId: number) => void;
  updateCollaboratorPermission: (collabId: number, permission: 'view' | 'edit') => void;
  duplicatePortfolio: (id: string) => void;
  addStressScenario: (scenario: Omit<StressScenario, 'id'>) => void;
  removeStressScenario: (id: number) => void;
  currentUserId: number;
  isLoading: boolean;
}

const PortfolioContext = createContext<PortfolioContextType | null>(null);

/* ────────────────────── Zero-value defaults */
const EMPTY_RISK: RiskMetricsData = {
  annualizedReturn: 0, annualizedVolatility: 0, sharpeRatio: 0, sortinoRatio: 0,
  calmarRatio: 0, informationRatio: 0, maxDrawdown: 0, maxDrawdownDuration: 0,
  beta: 0, alpha: 0, trackingError: 0, rSquared: 0,
  var95: 0, var99: 0, cvar95: 0, cvar99: 0, downsideDeviation: 0,
  skewness: 0, kurtosis: 0, bestDay: 0, worstDay: 0,
  bestMonth: 0, worstMonth: 0, positiveMonths: 0, winRate: 0,
};

function emptyPortfolio(id: string, ownerId: number, name: string, description: string, currency: string, benchmark: string): PortfolioData {
  return {
    id, ownerId,
    summary: { name, description, currency: currency as 'USD' | 'EUR', benchmark, totalValue: 0, dailyPnl: 0, dailyPnlPercent: 0, totalPnl: 0, totalPnlPercent: 0, positionCount: 0, cashBalance: 0, inceptionDate: new Date().toISOString().split('T')[0] },
    positions: [], transactions: [], collaborators: [],
    performanceData: [], monthlyReturns: [], returnDistribution: [],
    allocationByClass: [], allocationBySector: [], allocationByCountry: [],
    riskMetrics: { ...EMPTY_RISK },
    correlationMatrix: { labels: [], data: [] },
    efficientFrontierData: [], currentPortfolioPoint: { volatility: 0, return: 0 }, minVolPoint: { volatility: 0, return: 0 }, maxSharpePoint: { volatility: 0, return: 0 },
    optimizedWeights: [], stressScenarios: [], stressContributions: [],
    drawdownData: [], rollingVolatility: [], rollingCorrelation: [], recentActivity: [],
  };
}

/* ────────────────────── Helpers to map backend → frontend */
function mapPosition(p: any): Position {
  const entryVal = p.quantity * p.entry_price;
  const currentPrice = p.current_price ?? p.entry_price;
  const currentVal = p.quantity * currentPrice;
  const pnl = currentVal - entryVal;
  return {
    id: p.id,
    symbol: p.instrument_symbol ?? p.symbol ?? '',
    name: p.name ?? p.instrument_symbol ?? p.symbol ?? '',
    assetClass: p.asset_class ?? 'Equity',
    sector: p.sector ?? 'Other',
    country: p.country ?? 'US',
    currency: p.currency ?? 'USD',
    quantity: p.quantity,
    entryPrice: p.entry_price,
    currentPrice,
    entryDate: p.entry_date ?? '',
    pricingMode: p.pricing_mode ?? 'market',
    weight: p.weight ?? 0,
    pnl: p.pnl ?? parseFloat(pnl.toFixed(2)),
    pnlPercent: p.pnl_percent ?? (entryVal > 0 ? parseFloat(((pnl / entryVal) * 100).toFixed(2)) : 0),
    dailyChange: p.daily_change ?? 0,
  };
}

function mapTransaction(t: any): Transaction {
  return {
    id: t.id,
    date: t.date ?? '',
    type: t.type ?? 'buy',
    symbol: t.symbol ?? '',
    name: t.name ?? t.symbol ?? '',
    quantity: t.quantity ?? 0,
    price: t.price ?? 0,
    total: t.total ?? 0,
    currency: t.currency ?? 'USD',
    notes: t.notes ?? '',
  };
}

function mapCollaborator(c: any): Collaborator {
  return {
    id: c.id,
    userId: c.user_id,
    username: c.username ?? `user_${c.user_id}`,
    email: c.email ?? '',
    permission: c.permission ?? 'view',
    addedDate: c.added_date ?? '',
    avatar: (c.username ?? 'U').slice(0, 2).toUpperCase(),
  };
}

/* ────────────────────── Provider */
export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [portfolios, setPortfolios] = useState<PortfolioData[]>([]);
  const [activePortfolioId, setActivePortfolioId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { user: authUser } = useAuth();
  const currentUserId = authUser?.id ?? 1;
  const isBackend = useRef(false);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  /* ─── Fetch portfolio list ─── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('access_token');
        if (!token) {
          isBackend.current = false;
          setPortfolios(defaultPortfolios);
          setActivePortfolioId(defaultPortfolios[0]?.id ?? '');
          return;
        }
        isBackend.current = true;
        const pfs: any[] = await api.portfolios.list();
        if (cancelled) return;

        const mapped = pfs.map((p: any) =>
          emptyPortfolio(String(p.id), p.owner_id, p.name, p.description ?? '', p.currency ?? 'USD', p.benchmark_symbol ?? 'SPY')
        );
        setPortfolios(mapped);
        if (mapped.length > 0 && (!activePortfolioId || !mapped.find(m => m.id === activePortfolioId))) {
          setActivePortfolioId(mapped[0].id);
        }
      } catch (err) {
        console.error('Fetch portfolios failed', err);
        isBackend.current = false;
        setPortfolios(defaultPortfolios);
        setActivePortfolioId(defaultPortfolios[0]?.id ?? '');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);  // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Fetch full details for active portfolio ─── */
  useEffect(() => {
    if (!activePortfolioId || !isBackend.current) return;
    const numId = parseInt(activePortfolioId);
    if (isNaN(numId)) return;
    let cancelled = false;

    (async () => {
      try {
        const [details, analytics] = await Promise.all([
          api.portfolios.get(numId),
          api.portfolios.getAnalytics(numId).catch(() => null),
        ]);
        if (cancelled) return;

        // Map positions
        const positions: Position[] = (details.positions ?? []).map(mapPosition);
        const transactions: Transaction[] = (details.transactions ?? []).map(mapTransaction);
        const collaborators: Collaborator[] = (details.collaborators ?? []).map(mapCollaborator);

        // Summary from backend or compute
        const summary = details.summary ?? {};
        const totalValue = summary.totalValue ?? positions.reduce((s, p) => s + p.quantity * p.currentPrice, 0);
        const totalCost = positions.reduce((s, p) => s + p.quantity * p.entryPrice, 0);
        const totalPnl = summary.totalPnl ?? (totalValue - totalCost);

        // Recalc weights
        if (totalValue > 0) {
          positions.forEach(p => { p.weight = parseFloat(((p.quantity * p.currentPrice / totalValue) * 100).toFixed(1)); });
        }

        // Analytics data (or defaults)
        const a = analytics ?? {};
        const risk: RiskMetricsData = a.riskMetrics ?? { ...EMPTY_RISK };

        setPortfolios(prev => prev.map(pf => {
          if (pf.id !== activePortfolioId) return pf;
          return {
            ...pf,
            ownerId: details.owner_id ?? pf.ownerId,
            summary: {
              name: details.name ?? pf.summary.name,
              description: details.description ?? pf.summary.description,
              currency: (details.currency ?? pf.summary.currency) as 'USD' | 'EUR',
              benchmark: details.benchmark_symbol ?? pf.summary.benchmark,
              totalValue: Math.round(totalValue),
              dailyPnl: summary.dailyPnl ?? 0,
              dailyPnlPercent: summary.dailyPnlPercent ?? 0,
              totalPnl: Math.round(totalPnl),
              totalPnlPercent: totalCost > 0 ? parseFloat(((totalPnl / totalCost) * 100).toFixed(2)) : 0,
              positionCount: positions.length,
              cashBalance: summary.cashBalance ?? 0,
              inceptionDate: summary.inceptionDate ?? details.created_at?.split('T')[0] ?? pf.summary.inceptionDate,
            },
            positions,
            transactions,
            collaborators,
            riskMetrics: risk,
            performanceData: a.performanceData ?? [],
            monthlyReturns: a.monthlyReturns ?? [],
            returnDistribution: a.returnDistribution ?? [],
            allocationByClass: a.allocationByClass ?? [],
            allocationBySector: a.allocationBySector ?? [],
            allocationByCountry: a.allocationByCountry ?? [],
            correlationMatrix: a.correlationMatrix ?? { labels: [], data: [] },
            drawdownData: a.drawdownData ?? [],
            rollingVolatility: a.rollingVolatility ?? [],
            rollingCorrelation: a.rollingCorrelation ?? [],
          };
        }));
      } catch (e) {
        console.error('Fetch details failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, [activePortfolioId, refreshKey]);

  const activePortfolio = portfolios.find(p => p.id === activePortfolioId) || null;

  /* ────────────────────── CRUD callbacks ────────────────────── */

  const createPortfolio = useCallback(async (cfg: { name: string; description: string; currency: 'USD' | 'EUR'; benchmark: string }) => {
    if (!isBackend.current) {
      // mock-mode
      const id = `pf-${Date.now()}`;
      setPortfolios(prev => [...prev, emptyPortfolio(id, currentUserId, cfg.name, cfg.description, cfg.currency, cfg.benchmark)]);
      setActivePortfolioId(id);
      return;
    }
    try {
      const r = await api.portfolios.create({ name: cfg.name, description: cfg.description, currency: cfg.currency, benchmark_symbol: cfg.benchmark });
      const id = String(r.id);
      setPortfolios(prev => [...prev, emptyPortfolio(id, r.owner_id, r.name, r.description ?? '', r.currency ?? cfg.currency, r.benchmark_symbol ?? cfg.benchmark)]);
      setActivePortfolioId(id);
    } catch (e) { console.error('Create portfolio failed', e); }
  }, [currentUserId]);

  const deletePortfolio = useCallback(async (id: string) => {
    if (!isBackend.current) {
      setPortfolios(prev => prev.filter(p => p.id !== id));
      if (activePortfolioId === id) setActivePortfolioId('');
      return;
    }
    try {
      await api.portfolios.delete(parseInt(id));
      setPortfolios(prev => prev.filter(p => p.id !== id));
      if (activePortfolioId === id) setActivePortfolioId('');
    } catch (e) { console.error('Delete portfolio failed', e); }
  }, [activePortfolioId]);

  const addPosition = useCallback(async (pos: Omit<Position, 'id' | 'pnl' | 'pnlPercent' | 'dailyChange' | 'weight'>) => {
    if (!activePortfolioId) return;
    if (!isBackend.current) {
      setPortfolios(prev => prev.map(pf => {
        if (pf.id !== activePortfolioId) return pf;
        const newPos: Position = { ...pos, id: Date.now(), weight: 0, pnl: 0, pnlPercent: 0, dailyChange: 0 };
        return { ...pf, positions: [...pf.positions, newPos] };
      }));
      return;
    }
    try {
      await api.portfolios.addPosition(parseInt(activePortfolioId), {
        instrument_symbol: pos.symbol,
        quantity: pos.quantity,
        entry_price: pos.entryPrice,
        entry_date: pos.entryDate,
        pricing_mode: pos.pricingMode,
        ...(pos.pricingMode === 'fixed' && pos.currentPrice ? { current_price: pos.currentPrice } : {}),
      });
      refresh();
    } catch (e) { console.error('Add position failed', e); }
  }, [activePortfolioId, refresh]);

  const removePosition = useCallback(async (posId: number) => {
    if (!activePortfolioId) return;
    if (!isBackend.current) {
      setPortfolios(prev => prev.map(pf => pf.id !== activePortfolioId ? pf : { ...pf, positions: pf.positions.filter(p => p.id !== posId) }));
      return;
    }
    try {
      await api.portfolios.deletePosition(parseInt(activePortfolioId), posId);
      refresh();
    } catch (e) { console.error('Remove position failed', e); }
  }, [activePortfolioId, refresh]);

  const updatePosition = useCallback(async (posId: number, updates: Partial<Position>) => {
    if (!activePortfolioId) return;
    if (!isBackend.current) {
      setPortfolios(prev => prev.map(pf => pf.id !== activePortfolioId ? pf : { ...pf, positions: pf.positions.map(p => p.id === posId ? { ...p, ...updates } : p) }));
      return;
    }
    try {
      const payload: any = {};
      if (updates.quantity != null) payload.quantity = updates.quantity;
      if (updates.entryPrice != null) payload.entry_price = updates.entryPrice;
      if (updates.currentPrice != null) payload.current_price = updates.currentPrice;
      if (updates.pricingMode != null) payload.pricing_mode = updates.pricingMode;
      await api.portfolios.updatePosition(parseInt(activePortfolioId), posId, payload);
      refresh();
    } catch (e) { console.error('Update position failed', e); }
  }, [activePortfolioId, refresh]);

  const updatePortfolioMeta = useCallback(async (updates: { name?: string; description?: string; benchmark?: string }) => {
    if (!activePortfolioId) return;
    if (!isBackend.current) {
      setPortfolios(prev => prev.map(pf => pf.id !== activePortfolioId ? pf : { ...pf, summary: { ...pf.summary, ...updates } }));
      return;
    }
    try {
      const payload: any = {};
      if (updates.name) payload.name = updates.name;
      if (updates.description) payload.description = updates.description;
      if (updates.benchmark) payload.benchmark_symbol = updates.benchmark;
      await api.portfolios.update(parseInt(activePortfolioId), payload);
      refresh();
    } catch (e) { console.error('Update portfolio meta failed', e); }
  }, [activePortfolioId, refresh]);

  const addTransaction = useCallback(async (tx: Omit<Transaction, 'id'>) => {
    if (!activePortfolioId) return;
    if (!isBackend.current) {
      setPortfolios(prev => prev.map(pf => pf.id !== activePortfolioId ? pf : { ...pf, transactions: [{ ...tx, id: Date.now() }, ...pf.transactions] }));
      return;
    }
    try {
      await api.portfolios.addTransaction(parseInt(activePortfolioId), tx);
      refresh();
    } catch (e) { console.error('Add transaction failed', e); }
  }, [activePortfolioId, refresh]);

  const removeTransaction = useCallback(async (txId: number) => {
    if (!activePortfolioId) return;
    if (!isBackend.current) {
      setPortfolios(prev => prev.map(pf => pf.id !== activePortfolioId ? pf : { ...pf, transactions: pf.transactions.filter(t => t.id !== txId) }));
      return;
    }
    try {
      await api.portfolios.deleteTransaction(parseInt(activePortfolioId), txId);
      refresh();
    } catch (e) { console.error('Remove transaction failed', e); }
  }, [activePortfolioId, refresh]);

  const addCollaborator = useCallback(async (collab: Omit<Collaborator, 'id'>) => {
    if (!activePortfolioId) return;
    if (!isBackend.current) {
      setPortfolios(prev => prev.map(pf => pf.id !== activePortfolioId ? pf : { ...pf, collaborators: [...pf.collaborators, { ...collab, id: Date.now() }] }));
      return;
    }
    try {
      await api.portfolios.addCollaborator(parseInt(activePortfolioId), {
        user_id: collab.userId,
        permission: collab.permission,
      });
      refresh();
    } catch (e) { console.error('Add collaborator failed', e); }
  }, [activePortfolioId, refresh]);

  const removeCollaborator = useCallback(async (collabId: number) => {
    if (!activePortfolioId) return;
    if (!isBackend.current) {
      setPortfolios(prev => prev.map(pf => pf.id !== activePortfolioId ? pf : { ...pf, collaborators: pf.collaborators.filter(c => c.id !== collabId) }));
      return;
    }
    try {
      await api.portfolios.deleteCollaborator(parseInt(activePortfolioId), collabId);
      refresh();
    } catch (e) { console.error('Remove collaborator failed', e); }
  }, [activePortfolioId, refresh]);

  const updateCollaboratorPermission = useCallback(async (collabId: number, permission: 'view' | 'edit') => {
    if (!activePortfolioId) return;
    if (!isBackend.current) {
      setPortfolios(prev => prev.map(pf => pf.id !== activePortfolioId ? pf : { ...pf, collaborators: pf.collaborators.map(c => c.id === collabId ? { ...c, permission } : c) }));
      return;
    }
    try {
      await api.portfolios.updateCollaborator(parseInt(activePortfolioId), collabId, { permission });
      refresh();
    } catch (e) { console.error('Update collaborator failed', e); }
  }, [activePortfolioId, refresh]);

  const duplicatePortfolio = useCallback(async (id: string) => {
    if (!isBackend.current) {
      const src = portfolios.find(p => p.id === id);
      if (!src) return;
      const newId = `pf-${Date.now()}`;
      setPortfolios(prev => [...prev, { ...src, id: newId, summary: { ...src.summary, name: `${src.summary.name} (Copy)` } }]);
      setActivePortfolioId(newId);
      return;
    }
    try {
      const r = await api.portfolios.duplicate(parseInt(id));
      refresh();
      setActivePortfolioId(String(r.id));
    } catch (e) { console.error('Duplicate portfolio failed', e); }
  }, [portfolios, refresh]);

  /* Stress scenarios stay client-side (computed, not persisted) */
  const addStressScenario = useCallback((scenario: Omit<StressScenario, 'id'>) => {
    if (!activePortfolioId) return;
    setPortfolios(prev => prev.map(pf => {
      if (pf.id !== activePortfolioId) return pf;
      const newScenario: StressScenario = { ...scenario, id: Date.now() };
      return { ...pf, stressScenarios: [...pf.stressScenarios, newScenario] };
    }));
  }, [activePortfolioId]);

  const removeStressScenario = useCallback((scenarioId: number) => {
    if (!activePortfolioId) return;
    setPortfolios(prev => prev.map(pf => pf.id !== activePortfolioId ? pf : { ...pf, stressScenarios: pf.stressScenarios.filter(s => s.id !== scenarioId) }));
  }, [activePortfolioId]);

  /* ────────────────────── Render ────────────────────── */
  return (
    <PortfolioContext.Provider value={{
      portfolios,
      activePortfolio,
      activePortfolioId,
      setActivePortfolioId,
      createPortfolio,
      deletePortfolio,
      addPosition,
      removePosition,
      updatePosition,
      updatePortfolioMeta,
      addTransaction,
      removeTransaction,
      addCollaborator,
      removeCollaborator,
      updateCollaboratorPermission,
      duplicatePortfolio,
      addStressScenario,
      removeStressScenario,
      currentUserId,
      isLoading,
    }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error('usePortfolio must be used within PortfolioProvider');
  return ctx;
}
