from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_worker
from models.policy import Policy
from models.worker import Worker
from schemas.policy import (
    QuoteRequest,
    QuoteResponse,
    ActivateRequest,
    PolicyOut,
    TierQuote,
)
from services.premium_engine import get_all_tier_quotes, calculate_premium, TIER_CONFIG

router = APIRouter(prefix="/policies", tags=["policies"])


def _policy_to_out(policy: Policy) -> PolicyOut:
    return PolicyOut(
        id=str(policy.id),
        worker_id=str(policy.worker_id),
        tier=policy.tier,
        weekly_premium=float(policy.weekly_premium),
        base_premium=float(policy.base_premium),
        coverage_per_day=float(policy.coverage_per_day),
        max_days_per_week=policy.max_days_per_week,
        max_hours_per_day=policy.max_hours_per_day,
        status=policy.status,
        start_date=policy.start_date,
        zone_risk_score=float(policy.zone_risk_score) if policy.zone_risk_score else None,
        seasonal_factor=float(policy.seasonal_factor) if policy.seasonal_factor else None,
        claim_history_factor=float(policy.claim_history_factor) if policy.claim_history_factor else None,
        created_at=policy.created_at,
    )


@router.post("/quote", response_model=QuoteResponse)
def get_quote(body: QuoteRequest, db: Session = Depends(get_db)):
    quotes = get_all_tier_quotes(body.city, body.zone, db)
    return QuoteResponse(
        basic=TierQuote(**quotes["basic"]),
        standard=TierQuote(**quotes["standard"]),
        premium=TierQuote(**quotes["premium"]),
    )


@router.post("/activate", response_model=PolicyOut)
def activate_policy(
    body: ActivateRequest,
    db: Session = Depends(get_db),
    worker: Worker = Depends(get_current_worker),
):
    if body.tier not in TIER_CONFIG:
        raise HTTPException(status_code=400, detail="Invalid tier — must be basic, standard, or premium")

    quote = calculate_premium(body.tier, worker.city, worker.zone, db)
    config = TIER_CONFIG[body.tier]

    policy = Policy(
        worker_id=worker.id,
        tier=body.tier,
        weekly_premium=quote["weekly_premium"],
        base_premium=quote["base_premium"],
        coverage_per_day=config["daily_cap"],
        max_days_per_week=config["max_days"],
        max_hours_per_day=config["max_hours"],
        status="active",
        start_date=date.today(),
        zone_risk_score=quote["zone_risk_score"],
        seasonal_factor=quote["seasonal_factor"],
        claim_history_factor=quote["claim_history_factor"],
    )
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return _policy_to_out(policy)


@router.get("/me", response_model=PolicyOut)
def get_my_policy(
    db: Session = Depends(get_db),
    worker: Worker = Depends(get_current_worker),
):
    policy = (
        db.query(Policy)
        .filter(Policy.worker_id == worker.id, Policy.status == "active")
        .order_by(Policy.created_at.desc())
        .first()
    )
    if not policy:
        raise HTTPException(status_code=404, detail="No active policy found")
    return _policy_to_out(policy)
