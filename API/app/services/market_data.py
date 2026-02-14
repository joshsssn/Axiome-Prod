import yfinance as yf
from datetime import date, datetime, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.models.instrument import Instrument, PriceHistory

# Common stocks metadata fallback for when yfinance .info is rate-limited
_KNOWN_META: Dict[str, Dict[str, str]] = {
    "AAPL": {"name": "Apple Inc.", "sector": "Technology", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "MSFT": {"name": "Microsoft Corp.", "sector": "Technology", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "GOOGL": {"name": "Alphabet Inc.", "sector": "Technology", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "GOOG": {"name": "Alphabet Inc.", "sector": "Technology", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "AMZN": {"name": "Amazon.com Inc.", "sector": "Consumer Discretionary", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "NVDA": {"name": "NVIDIA Corp.", "sector": "Technology", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "META": {"name": "Meta Platforms Inc.", "sector": "Technology", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "TSLA": {"name": "Tesla Inc.", "sector": "Consumer Discretionary", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "BRK-B": {"name": "Berkshire Hathaway B", "sector": "Financials", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "JPM": {"name": "JPMorgan Chase", "sector": "Financials", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "V": {"name": "Visa Inc.", "sector": "Financials", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "JNJ": {"name": "Johnson & Johnson", "sector": "Healthcare", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "UNH": {"name": "UnitedHealth Group", "sector": "Healthcare", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "WMT": {"name": "Walmart Inc.", "sector": "Consumer Staples", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "PG": {"name": "Procter & Gamble", "sector": "Consumer Staples", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "XOM": {"name": "Exxon Mobil Corp.", "sector": "Energy", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "MA": {"name": "Mastercard Inc.", "sector": "Financials", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "HD": {"name": "Home Depot Inc.", "sector": "Consumer Discretionary", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "DIS": {"name": "Walt Disney Co.", "sector": "Communication Services", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "NFLX": {"name": "Netflix Inc.", "sector": "Communication Services", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "ADBE": {"name": "Adobe Inc.", "sector": "Technology", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "CRM": {"name": "Salesforce Inc.", "sector": "Technology", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "AMD": {"name": "Advanced Micro Devices", "sector": "Technology", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "INTC": {"name": "Intel Corp.", "sector": "Technology", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "CSCO": {"name": "Cisco Systems", "sector": "Technology", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "BA": {"name": "Boeing Co.", "sector": "Industrials", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "GS": {"name": "Goldman Sachs", "sector": "Financials", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "KO": {"name": "Coca-Cola Co.", "sector": "Consumer Staples", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "PEP": {"name": "PepsiCo Inc.", "sector": "Consumer Staples", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "COST": {"name": "Costco Wholesale", "sector": "Consumer Staples", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "T": {"name": "AT&T Inc.", "sector": "Communication Services", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "VZ": {"name": "Verizon Communications", "sector": "Communication Services", "country": "US", "currency": "USD", "asset_class": "Equity"},
    "SPY": {"name": "SPDR S&P 500 ETF", "sector": "Index Fund", "country": "US", "currency": "USD", "asset_class": "ETF"},
    "QQQ": {"name": "Invesco QQQ Trust", "sector": "Index Fund", "country": "US", "currency": "USD", "asset_class": "ETF"},
    "IWM": {"name": "iShares Russell 2000", "sector": "Index Fund", "country": "US", "currency": "USD", "asset_class": "ETF"},
    "GLD": {"name": "SPDR Gold Shares", "sector": "Commodities", "country": "US", "currency": "USD", "asset_class": "Commodity ETF"},
    "TLT": {"name": "iShares 20+ Year Treasury", "sector": "Fixed Income", "country": "US", "currency": "USD", "asset_class": "Bond ETF"},
    "BND": {"name": "Vanguard Total Bond Market", "sector": "Fixed Income", "country": "US", "currency": "USD", "asset_class": "Bond ETF"},
    "VTI": {"name": "Vanguard Total Stock Market", "sector": "Index Fund", "country": "US", "currency": "USD", "asset_class": "ETF"},
    "VOO": {"name": "Vanguard S&P 500 ETF", "sector": "Index Fund", "country": "US", "currency": "USD", "asset_class": "ETF"},
    "ARKK": {"name": "ARK Innovation ETF", "sector": "Technology", "country": "US", "currency": "USD", "asset_class": "ETF"},
    "^GSPC": {"name": "S&P 500 Index", "sector": "Index", "country": "US", "currency": "USD", "asset_class": "Index"},
    "^DJI": {"name": "Dow Jones Industrial", "sector": "Index", "country": "US", "currency": "USD", "asset_class": "Index"},
    "^IXIC": {"name": "NASDAQ Composite", "sector": "Index", "country": "US", "currency": "USD", "asset_class": "Index"},
}

class MarketDataService:
    def __init__(self, db: Session):
        self.db = db

    def get_instrument_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Fetch instrument metadata from yfinance.
        """
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            # Map yfinance info to our model
            return {
                "symbol": symbol,
                "name": info.get("longName") or info.get("shortName"),
                "asset_class": info.get("quoteType", "Equity"), # simplified
                "sector": info.get("sector"),
                "country": info.get("country"),
                "currency": info.get("currency"),
                "current_price": info.get("currentPrice") or info.get("regularMarketPrice")
            }
        except Exception as e:
            print(f"Error fetching info for {symbol}: {e}")
            return None

    def sync_instrument(self, symbol: str) -> Optional[Instrument]:
        """
        Ensure instrument exists in DB and is updated.
        Uses yfinance .info when possible, falls back to known metadata + price history.
        """
        instrument = self.db.query(Instrument).filter(Instrument.symbol == symbol).first()
        
        should_update = False
        if not instrument:
            should_update = True
        elif instrument.last_updated != date.today():
            should_update = True

        if should_update:
            info = self.get_instrument_info(symbol)

            # If yfinance .info failed, build fallback from known metadata + price history
            if not info:
                known = _KNOWN_META.get(symbol, {})
                # Try to get latest price from DB history
                latest_price = None
                last_record = self.db.query(PriceHistory).filter(
                    PriceHistory.instrument_symbol == symbol
                ).order_by(PriceHistory.date.desc()).first()
                if last_record:
                    latest_price = last_record.adjusted_close or last_record.close

                info = {
                    "symbol": symbol,
                    "name": known.get("name", symbol),
                    "asset_class": known.get("asset_class", "Equity"),
                    "sector": known.get("sector"),
                    "country": known.get("country", "US"),
                    "currency": known.get("currency", "USD"),
                    "current_price": latest_price,
                }

            if not instrument:
                instrument = Instrument(**info)
                instrument.last_updated = date.today()
                self.db.add(instrument)
            else:
                for key, value in info.items():
                    if value is not None:
                        setattr(instrument, key, value)
                instrument.last_updated = date.today()
            
            self.db.commit()
            self.db.refresh(instrument)
            
        return instrument

    def get_price_history(self, symbol: str, start_date: date, end_date: date = date.today()) -> List[PriceHistory]:
        """
        Get historical data, fetching from YF if missing in DB.
        This is a simplified implementation. A robust one would check for gaps.
        """
        # Check DB first
        history = self.db.query(PriceHistory).filter(
            PriceHistory.instrument_symbol == symbol,
            PriceHistory.date >= start_date,
            PriceHistory.date <= end_date
        ).order_by(PriceHistory.date).all()
        
        if not history:
            # Fetch from YF
            ticker = yf.Ticker(symbol)
            df = ticker.history(start=start_date, end=end_date + timedelta(days=1))
            
            if df.empty:
                return []
            
            new_records = []
            for index, row in df.iterrows():
                # index is Timestamp
                record = PriceHistory(
                    instrument_symbol=symbol,
                    date=index.date(),
                    open=row['Open'],
                    high=row['High'],
                    low=row['Low'],
                    close=row['Close'],
                    volume=row['Volume'],
                    adjusted_close=row['Close'] # user might want standard close
                )
                self.db.add(record)
                new_records.append(record)
            
            self.db.commit()
            return new_records
            
        return history
