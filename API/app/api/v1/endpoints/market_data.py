from typing import Any, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.api import deps
from app.services.market_data import MarketDataService

router = APIRouter()

@router.get("/price/{symbol}")
def get_price(
    symbol: str,
    date: date,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get historical price for a symbol on a specific date.
    """
    md_service = MarketDataService(db)
    # Fetch for that specific day
    history = md_service.get_price_history(symbol, date, date)
    
    if not history:
        # Try fetching via yfinance directly if service didn't return (though service should have tried)
        # Service logic: get_price_history checks DB, if empty, fetches YF range.
        # If today is weekend/holiday, YF might return empty for exact date.
        # We could try a small window? 
        # But for now, let's trust the service or return 404.
        raise HTTPException(status_code=404, detail="Price not found for this date")

    # Return the close price
    return {"symbol": symbol, "date": date, "price": history[0].close}
