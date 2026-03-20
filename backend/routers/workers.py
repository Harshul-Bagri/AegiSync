from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_worker
from ml.risk_scorer import compute_zone_risk
from models.claim import Claim
from models.policy import Policy
from models.worker import Worker
from schemas.policy import PolicyOut
from schemas.worker import ClaimSummary, WorkerCreate, WorkerMe, WorkerResponse, WorkerUpdate
from services.premium_engine import TIER_CONFIG, calculate_premium, get_all_tier_quotes

router = APIRouter(prefix="/workers", tags=["workers"])


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


def _worker_to_response(
    worker: Worker, suggested_premiums: dict, policy: Policy | None
) -> WorkerResponse:
    return WorkerResponse(
        id=str(worker.id),
        name=worker.name,
        phone=worker.phone,
        email=worker.email,
        city=worker.city,
        zone=worker.zone,
        pincode=worker.pincode,
        platform=worker.platform,
        platform_id=worker.platform_id,
        upi_id=worker.upi_id,
        avg_daily_earning=float(worker.avg_daily_earning),
        years_active=worker.years_active,
        risk_score=float(worker.risk_score) if worker.risk_score else None,
        is_verified=worker.is_verified,
        created_at=worker.created_at,
        suggested_premiums=suggested_premiums,
        policy=_policy_to_out(policy) if policy else None,
    )


@router.post("/register", response_model=WorkerResponse, status_code=201)
def register_worker(body: WorkerCreate, db: Session = Depends(get_db)):
    if db.query(Worker).filter(Worker.phone == body.phone).first():
        raise HTTPException(status_code=409, detail="Phone already registered")
    if body.platform not in ("zomato", "swiggy"):
        raise HTTPException(status_code=422, detail="Platform must be 'zomato' or 'swiggy'")

    risk_score = compute_zone_risk(body.city, body.zone, db)

    worker = Worker(
        name=body.name, phone=body.phone, email=body.email,
        city=body.city, zone=body.zone, pincode=body.pincode,
        platform=body.platform, platform_id=body.platform_id,
        upi_id=body.upi_id, avg_daily_earning=body.avg_daily_earning,
        years_active=body.years_active, risk_score=risk_score,
    )
    db.add(worker)
    db.commit()
    db.refresh(worker)

    policy = None
    if body.tier and body.tier in TIER_CONFIG:
        quote = calculate_premium(body.tier, body.city, body.zone, db)
        cfg = TIER_CONFIG[body.tier]
        policy = Policy(
            worker_id=worker.id, tier=body.tier,
            weekly_premium=quote["weekly_premium"], base_premium=quote["base_premium"],
            coverage_per_day=cfg["daily_cap"], max_days_per_week=cfg["max_days"],
            max_hours_per_day=cfg["max_hours"], status="active", start_date=date.today(),
            zone_risk_score=quote["zone_risk_score"], seasonal_factor=quote["seasonal_factor"],
            claim_history_factor=quote["claim_history_factor"],
        )
        db.add(policy)
        db.commit()
        db.refresh(policy)

    suggested = get_all_tier_quotes(body.city, body.zone, db)
    return _worker_to_response(worker, suggested, policy)


@router.get("/me", response_model=WorkerMe)
def get_me(db: Session = Depends(get_db), worker: Worker = Depends(get_current_worker)):
    policy = (
        db.query(Policy)
        .filter(Policy.worker_id == worker.id, Policy.status == "active")
        .order_by(Policy.created_at.desc())
        .first()
    )
    recent_claims = (
        db.query(Claim)
        .filter(Claim.worker_id == worker.id)
        .order_by(Claim.created_at.desc())
        .limit(5)
        .all()
    )
    total = (
        db.query(func.sum(Claim.amount))
        .filter(Claim.worker_id == worker.id, Claim.status == "approved")
        .scalar()
    ) or 0.0

    return WorkerMe(
        id=str(worker.id), name=worker.name, phone=worker.phone,
        city=worker.city, zone=worker.zone, platform=worker.platform,
        upi_id=worker.upi_id, avg_daily_earning=float(worker.avg_daily_earning),
        risk_score=float(worker.risk_score) if worker.risk_score else None,
        is_verified=worker.is_verified, created_at=worker.created_at,
        policy=_policy_to_out(policy) if policy else None,
        recent_claims=[
            ClaimSummary(
                id=str(c.id), status=c.status, claim_type=c.claim_type,
                amount=float(c.amount),
                hours_lost=float(c.hours_lost) if c.hours_lost else None,
                fraud_score=float(c.fraud_score) if c.fraud_score else None,
                auto_approved=c.auto_approved, created_at=c.created_at,
            )
            for c in recent_claims
        ],
        total_earnings_protected=float(total),
    )


@router.patch("/me", response_model=WorkerResponse)
def update_me(
    body: WorkerUpdate,
    db: Session = Depends(get_db),
    worker: Worker = Depends(get_current_worker),
):
    if body.upi_id is not None:
        worker.upi_id = body.upi_id
    if body.avg_daily_earning is not None:
        worker.avg_daily_earning = body.avg_daily_earning
    if body.zone is not None:
        worker.zone = body.zone
        worker.risk_score = compute_zone_risk(worker.city, body.zone, db)
    db.commit()
    db.refresh(worker)

    policy = (
        db.query(Policy)
        .filter(Policy.worker_id == worker.id, Policy.status == "active")
        .order_by(Policy.created_at.desc())
        .first()
    )
    suggested = get_all_tier_quotes(worker.city, worker.zone, db)
    return _worker_to_response(worker, suggested, policy)
