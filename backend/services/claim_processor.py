from datetime import datetime

from sqlalchemy.orm import Session

from models.claim import Claim
from models.disruption import Disruption
from models.policy import Policy
from models.worker import Worker

# Hours of lost income mapped to disruption severity
_SEVERITY_HOURS = {"moderate": 2, "severe": 4, "extreme": 6}

# Peak delivery hours in UTC (IST-5:30):
#   12:00-14:00 IST = 06:30-08:30 UTC -> check range 6-8
#   19:00-22:00 IST = 13:30-16:30 UTC -> check range 13-16
_PEAK_UTC_HOURS = set(range(6, 9)) | set(range(13, 17))


def create_automatic_claim(
    worker: Worker,
    policy: Policy,
    disruption: Disruption,
    db: Session,
) -> "Claim | None":
    """
    Auto-create a claim for a worker affected by a disruption.
    Returns None if a claim already exists for this worker + disruption.
    """
    from services import fraud_engine
    from services import payout_service
    from services.notification_service import (
        notify_admin_manual_review,
        notify_worker_claim_created,
    )

    # 1. Duplicate guard
    existing = (
        db.query(Claim)
        .filter(
            Claim.worker_id == worker.id,
            Claim.disruption_id == disruption.id,
        )
        .first()
    )
    if existing:
        return None

    # 2. Compute hours_lost
    base_hours = float(_SEVERITY_HOURS.get(disruption.severity, 2))
    current_utc_hour = datetime.utcnow().hour
    if current_utc_hour in _PEAK_UTC_HOURS:
        base_hours = base_hours * 1.5
    hours_lost = min(base_hours, float(policy.max_hours_per_day))

    # 3. Compute payout amount
    avg_daily = float(worker.avg_daily_earning)
    hourly_rate = avg_daily / 8.0
    raw_amount = hourly_rate * hours_lost
    amount = round(min(raw_amount, float(policy.coverage_per_day)), 2)

    # 4. Run fraud engine
    result = fraud_engine.evaluate(worker, disruption, policy, db)

    # 5. Determine claim status
    # Auto-approve: good BAS (genuine outdoor behaviour) + overall fraud score below threshold
    if result.bas_score > 55 and result.fraud_score < 55:
        status = "approved"
        auto_approved = True
        review_reason = None
    elif result.fraud_score >= 70 or result.bas_score < 30:
        # High fraud score or very suspicious BAS → manual review queue
        status = "manual_review"
        auto_approved = False
        review_reason = "Fraud signals detected — manual review required"
    else:
        status = "pending"
        auto_approved = False
        review_reason = f"Fraud score {result.fraud_score:.0f} — soft hold pending re-evaluation"

    # 6. Insert claim
    claim = Claim(
        worker_id=worker.id,
        policy_id=policy.id,
        disruption_id=disruption.id,
        status=status,
        claim_type=disruption.type,
        hours_lost=hours_lost,
        amount=amount,
        fraud_score=result.fraud_score,
        bas_score=result.bas_score,
        fraud_flags=result.fraud_flags if result.fraud_flags else None,
        fraud_method=result.fraud_method,
        review_reason=review_reason,
        auto_approved=auto_approved,
    )
    db.add(claim)
    db.commit()
    db.refresh(claim)

    print(
        f"[CLAIM] {disruption.type}/{disruption.severity} | {worker.name} ({worker.city}) | "
        f"amount=Rs{amount:.2f} | status={status} | "
        f"bas={result.bas_score:.1f} fraud={result.fraud_score:.1f}"
    )

    # 7. Post-insert actions
    if auto_approved:
        payout_service.initiate(claim, db)
    elif status == "manual_review":
        notify_admin_manual_review(claim)

    # 8. Notify worker
    notify_worker_claim_created(worker, claim)

    return claim


def auto_create_claims_for_disruption(disruption: Disruption, db: Session) -> None:
    """
    Find all workers with active policies in the affected city (and zone if set),
    then auto-create a claim for each one.
    Called from trigger_monitor after a new disruption is inserted.
    """
    query = (
        db.query(Worker, Policy)
        .join(Policy, Policy.worker_id == Worker.id)
        .filter(
            Worker.city == disruption.city,
            Policy.status == "active",
        )
    )
    if disruption.zone:
        query = query.filter(Worker.zone == disruption.zone)

    pairs = query.all()
    if not pairs:
        print(f"[CLAIM] No active workers in {disruption.city} for disruption {disruption.id}")
        return

    print(f"[CLAIM] Processing {len(pairs)} workers for disruption {disruption.id} ({disruption.type}/{disruption.city})")
    for worker, policy in pairs:
        try:
            create_automatic_claim(worker, policy, disruption, db)
        except Exception as e:
            print(f"[WARN] claim_processor/{worker.id}: {e}")
