from typing import List, Dict, Optional, Any
from pydantic import BaseModel

class RiskMetrics(BaseModel):
    annualizedReturn: float
    annualizedVolatility: float
    sharpeRatio: float
    sortinoRatio: float
    calmarRatio: float
    informationRatio: float
    maxDrawdown: float
    maxDrawdownDuration: float
    beta: float
    alpha: float
    trackingError: float
    rSquared: float
    var95: float
    var99: float
    cvar95: float
    cvar99: float
    downsideDeviation: float
    skewness: float
    kurtosis: float
    bestDay: float
    worstDay: float
    bestMonth: float
    worstMonth: float
    positiveMonths: int
    winRate: float

class AllocationItem(BaseModel):
    name: str
    value: float
    color: Optional[str] = None

class ChartPoint(BaseModel):
    date: str
    value: float

class PerformancePoint(BaseModel):
    date: str
    portfolio: float
    benchmark: float
    portfolioReturn: float
    benchmarkReturn: float

class MonthlyReturn(BaseModel):
    month: str
    portfolio: float
    benchmark: float

class DistributionBin(BaseModel):
    bin: str
    frequency: int

class CorrelationMatrix(BaseModel):
    labels: List[str]
    data: List[List[float]]

class PortfolioAnalytics(BaseModel):
    riskMetrics: RiskMetrics
    performanceData: List[PerformancePoint]
    monthlyReturns: List[MonthlyReturn]
    returnDistribution: List[DistributionBin]
    allocationByClass: List[AllocationItem]
    allocationBySector: List[AllocationItem]
    allocationByCountry: List[AllocationItem]
    correlationMatrix: CorrelationMatrix
    drawdownData: List[Dict[str, Any]] # date, drawdown, cumReturn
    rollingVolatility: List[Dict[str, Any]]
    rollingCorrelation: List[Dict[str, Any]]
