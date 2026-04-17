from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_admin
from models.claim import Claim
from models.disruption import Disruption
from models.payout import Payout
from models.policy import Policy
from models.worker import Worker
from schemas.claim import ApproveResponse, ClaimOut, PayoutOut, RejectRequest
from schemas.disruption import (
    DisruptionOut,
    SimulateDisruptionRequest,
    SimulateDisruptionResponse,
)

router = APIRouter(prefix="/admin", tags=["admin"])

_ACTIVE_CITIES = ("Bengaluru", "Mumbai", "Delhi", "Chennai", "Pune", "Hyderabad")
_VALID_TYPES = ("rainfall", "aqi", "flood", "bandh", "outage")
_VALID_SEVERITIES = ("moderate", "severe", "extreme")

# Trigger/threshold values used by the simulate endpoint
_RAINFALL_THRESHOLDS = {"moderate": 15.0, "severe": 35.0, "extreme": 60.0}
_AQI_THRESHOLDS = {"severe": 150.0, "extreme": 250.0}

_CITY_COORDS = {
    "Bengaluru": {"lat": 12.9716, "lng": 77.5946},
    "Mumbai":    {"lat": 19.0760, "lng": 72.8777},
    "Delhi":     {"lat": 28.6139, "lng": 77.2090},
    "Chennai":   {"lat": 13.0827, "lng": 80.2707},
    "Pune":      {"lat": 18.5204, "lng": 73.8567},
    "Hyderabad": {"lat": 17.3850, "lng": 78.4867},
}

_SEVERITY_WEIGHTS = {"moderate": 1, "severe": 2, "extreme": 3}
_PAGE_SIZE = 20


# ── Helpers ───────────────────────────────────────────────────────────────────

def _sim_values(dtype: str, severity: str) -> tuple:
    """Return (trigger_value, threshold_value) for a simulated disruption."""
    if dtype == "rainfall":
        thresh = _RAINFALL_THRESHOLDS.get(severity, 15.0)
        return thresh + 5.0, thresh
    if dtype == "aqi":
        thresh = _AQI_THRESHOLDS.get(severity, 150.0)
        return thresh + 10.0, thresh
    if dtype == "outage":
        return 180.0, 120.0
    return 1.0, 1.0   # flood, bandh


def _claim_out(claim: Claim, worker: Optional[Worker] = None, db: Optional[Session] = None) -> ClaimOut:
    c = ClaimOut.model_validate(claim)
    if worker:
        c.worker_name = worker.name
        c.worker_city = worker.city
        c.worker_phone = worker.phone
    if db is not None:
        payout = (
            db.query(Payout)
            .filter(Payout.claim_id == claim.id, Payout.status == "completed")
            .order_by(Payout.initiated_at.desc())
            .first()
        )
        if payout:
            c.payout_gateway = payout.gateway or "razorpay"
    return c


def _disruption_out(d: Disruption, workers_affected: int = 0) -> DisruptionOut:
    out = DisruptionOut.model_validate(d)
    out.workers_affected = workers_affected
    return out


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard")
def get_dashboard(
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    total_workers = db.query(Worker).count()
    active_policies = db.query(Policy).filter(Policy.status == "active").count()
    claims_today = db.query(Claim).filter(Claim.created_at >= today_start).count()
    amount_paid_today = (
        db.query(func.sum(Payout.amount))
        .filter(Payout.status == "completed", Payout.completed_at >= today_start)
        .scalar()
        or 0.0
    )
    fraud_queue_count = db.query(Claim).filter(Claim.status == "manual_review").count()

    top_city_row = (
        db.query(Disruption.city, func.count(Disruption.id).label("cnt"))
        .group_by(Disruption.city)
        .order_by(text("cnt DESC"))
        .first()
    )
    top_city = top_city_row.city if top_city_row else None

    return {
        "total_workers": total_workers,
        "active_policies": active_policies,
        "claims_today": claims_today,
        "amount_paid_today": round(float(amount_paid_today), 2),
        "fraud_queue_count": fraud_queue_count,
        "top_disrupted_city": top_city,
    }


# ── Claims management ─────────────────────────────────────────────────────────

@router.get("/claims")
def list_claims(
    status: Optional[str] = None,
    page: int = 1,
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    q = (
        db.query(Claim, Worker)
        .join(Worker, Worker.id == Claim.worker_id)
        .order_by(Claim.created_at.desc())
    )
    if status:
        q = q.filter(Claim.status == status)

    total = q.count()
    rows = q.offset((page - 1) * _PAGE_SIZE).limit(_PAGE_SIZE).all()

    items = [_claim_out(claim, worker, db) for claim, worker in rows]
    return {"total": total, "page": page, "page_size": _PAGE_SIZE, "items": items}


@router.post("/claims/{claim_id}/approve", response_model=ApproveResponse)
def approve_claim(
    claim_id: UUID,
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    if claim.status == "approved":
        raise HTTPException(status_code=400, detail="Claim already approved")
    if claim.status == "rejected":
        raise HTTPException(status_code=400, detail="Cannot approve a rejected claim")

    claim.status = "approved"
    claim.reviewed_by = admin
    claim.reviewed_at = datetime.utcnow()
    db.commit()

    from services.payout_service import initiate
    payout = initiate(claim, db)

    db.refresh(claim)
    return ApproveResponse(
        claim=_claim_out(claim),
        payout=PayoutOut.model_validate(payout),
    )


@router.post("/claims/{claim_id}/reject", response_model=ClaimOut)
def reject_claim(
    claim_id: UUID,
    body: RejectRequest,
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    if claim.status in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail=f"Claim already {claim.status}")

    claim.status = "rejected"
    claim.review_reason = body.reason
    claim.reviewed_by = admin
    claim.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(claim)
    return _claim_out(claim)


# ── Disruptions ───────────────────────────────────────────────────────────────

@router.get("/disruptions/active")
def list_active_disruptions(
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    disruptions = (
        db.query(Disruption)
        .filter(Disruption.is_active == True)
        .order_by(Disruption.started_at.desc())
        .all()
    )
    result = []
    for d in disruptions:
        count = db.query(Claim).filter(Claim.disruption_id == d.id).count()
        result.append(_disruption_out(d, count))
    return result


@router.post("/disruptions/simulate", response_model=SimulateDisruptionResponse)
def simulate_disruption(
    body: SimulateDisruptionRequest,
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if body.type not in _VALID_TYPES:
        raise HTTPException(400, f"type must be one of: {_VALID_TYPES}")
    if body.city not in _ACTIVE_CITIES:
        raise HTTPException(400, f"city must be one of: {_ACTIVE_CITIES}")
    if body.severity not in _VALID_SEVERITIES:
        raise HTTPException(400, f"severity must be one of: {_VALID_SEVERITIES}")

    # End any existing active disruption of same type+city to allow a fresh one
    existing = (
        db.query(Disruption)
        .filter(
            Disruption.city == body.city,
            Disruption.type == body.type,
            Disruption.is_active == True,
        )
        .first()
    )
    if existing:
        existing.is_active = False
        existing.ended_at = datetime.utcnow()
        db.commit()

    trigger_value, threshold_value = _sim_values(body.type, body.severity)

    disruption = Disruption(
        type=body.type,
        city=body.city,
        zone=body.zone,
        severity=body.severity,
        trigger_value=trigger_value,
        threshold_value=threshold_value,
        api_source="admin_simulate",
        started_at=datetime.utcnow(),
        is_active=True,
    )
    db.add(disruption)
    db.commit()
    db.refresh(disruption)

    from services.forecasting import invalidate_cache
    invalidate_cache()

    from services.claim_processor import auto_create_claims_for_disruption
    auto_create_claims_for_disruption(disruption, db)

    claims_created = db.query(Claim).filter(Claim.disruption_id == disruption.id).count()
    print(
        f"[SIMULATE] {body.type}/{body.severity} in {body.city} "
        f"(zone={body.zone or 'city-wide'}) -- {claims_created} claims created by admin={admin}"
    )

    return SimulateDisruptionResponse(
        disruption=_disruption_out(disruption, claims_created),
        claims_created=claims_created,
    )


# ── Fraud queue ───────────────────────────────────────────────────────────────

@router.get("/fraud/queue")
def get_fraud_queue(
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Claim, Worker)
        .join(Worker, Worker.id == Claim.worker_id)
        .filter(
            (Claim.fraud_score > 50) | (Claim.status == "manual_review")
        )
        .order_by(Claim.fraud_score.desc())
        .all()
    )
    return [_claim_out(claim, worker, db) for claim, worker in rows]


# ── Analytics ─────────────────────────────────────────────────────────────────

@router.get("/analytics/loss-ratio")
def get_loss_ratio(
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    results = []
    for city in _ACTIVE_CITIES:
        # Premium collected = sum of all active policies' weekly_premium in this city
        premium = (
            db.query(func.sum(Policy.weekly_premium))
            .join(Worker, Worker.id == Policy.worker_id)
            .filter(Worker.city == city, Policy.status == "active")
            .scalar()
            or 0.0
        )

        # Claims paid = sum of completed payout amounts for this city
        claims_paid = (
            db.query(func.sum(Payout.amount))
            .join(Claim, Claim.id == Payout.claim_id)
            .join(Worker, Worker.id == Claim.worker_id)
            .filter(Worker.city == city, Payout.status == "completed")
            .scalar()
            or 0.0
        )

        premium_f = float(premium)
        paid_f = float(claims_paid)
        loss_ratio = round(paid_f / premium_f, 4) if premium_f > 0 else 0.0

        results.append({
            "city": city,
            "premium_collected": round(premium_f, 2),
            "claims_paid": round(paid_f, 2),
            "loss_ratio": loss_ratio,
        })
    return results


@router.get("/analytics/disruption-heatmap")
def get_disruption_heatmap(
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    disruptions = db.query(Disruption).all()

    city_data: dict = {}
    for d in disruptions:
        key = (d.city, d.zone or "city-wide")
        if key not in city_data:
            city_data[key] = {
                "total": 0, "active": 0, "severity_sum": 0, "types": {}
            }
        city_data[key]["total"] += 1
        if d.is_active:
            city_data[key]["active"] += 1
        city_data[key]["severity_sum"] += _SEVERITY_WEIGHTS.get(d.severity, 1)
        city_data[key]["types"][d.type] = city_data[key]["types"].get(d.type, 0) + 1

    result = []
    for (city, zone), data in city_data.items():
        coords = _CITY_COORDS.get(city, {"lat": 0.0, "lng": 0.0})
        result.append({
            "city": city,
            "zone": zone,
            "lat": coords["lat"],
            "lng": coords["lng"],
            "total_disruptions": data["total"],
            "active_disruptions": data["active"],
            "severity_score": round(data["severity_sum"] / data["total"], 2),
            "disruption_types": data["types"],
        })

    result.sort(key=lambda x: x["severity_score"], reverse=True)
    return result


@router.get("/analytics/forecast")
def get_forecast(
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Return 7-day predicted disruption probability per city and type.
    Trains Prophet models on historical disruptions (or synthetic data if sparse).
    Results are cached for 1 hour.
    """
    from services.forecasting import get_forecast as _get_forecast
    return _get_forecast(db)
