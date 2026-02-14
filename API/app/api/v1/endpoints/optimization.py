from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session

from app import models
from app.api import deps
from app.models.portfolio import Portfolio, Collaborator
from app.services.optimization import OptimizationService

router = APIRouter()


def _check_portfolio_access(db: Session, id: int, current_user: models.User) -> Portfolio:
    """Get portfolio and verify user has access (owner or collaborator)."""
    portfolio = db.query(Portfolio).filter(Portfolio.id == id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    if portfolio.owner_id != current_user.id:
        collab = db.query(Collaborator).filter(
            Collaborator.portfolio_id == id,
            Collaborator.user_id == current_user.id,
        ).first()
        if not collab:
            raise HTTPException(status_code=403, detail="Access denied")
    return portfolio


@router.post("/{id}/optimize")
def optimize_portfolio(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    target: str = Body(..., embed=True), # e.g. {"target": "max_sharpe"}
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Optimize portfolio weights."""
    portfolio = _check_portfolio_access(db, id, current_user)
    opt_service = OptimizationService(db)
    result = opt_service.optimize_portfolio(portfolio, target=target)
    return result

@router.get("/{id}/optimize/frontier")
def get_efficient_frontier(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Get efficient frontier data and optimization results."""
    portfolio = _check_portfolio_access(db, id, current_user)
    opt_service = OptimizationService(db)
    result = opt_service.get_full_optimization_data(portfolio)
    return result
