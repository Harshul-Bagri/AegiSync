from datetime import datetime

from sqlalchemy.orm import Session

from models.claim import Claim
from models.payout import Payout
from models.worker import Worker

# UPI handle suffixes that should be routed via the UPI simulator
_UPI_HANDLES = frozenset({"@upi", "@okaxis", "@ybl", "@paytm", "@ibl"})


def _is_upi_handle(upi_id: str) -> bool:
    lower = upi_id.lower()
    return any(lower.endswith(h) for h in _UPI_HANDLES)


def initiate(claim: Claim, db: Session, gateway: str = "auto") -> Payout:
    """
    Create a Payout record, call the appropriate payment gateway, and persist.

    Gateway selection:
    - "auto"     → UPI simulator if worker's upi_id ends with a known UPI handle,
                   otherwise Razorpay (default behaviour).
    - "upi"      → Force UPI simulator.
    - "razorpay" → Force Razorpay mock.

    Also updates claim status to 'approved' on success.
    """
    worker = db.query(Worker).filter(Worker.id == claim.worker_id).first()
    upi_id = worker.upi_id if worker else "unknown@upi"

    # Resolve gateway
    if gateway == "auto":
        resolved = "upi" if _is_upi_handle(upi_id) else "razorpay"
    else:
        resolved = gateway

    if resolved == "upi":
        from integrations.upi_simulator import initiate_transfer as upi_transfer
        result = upi_transfer(upi_id, float(claim.amount), str(claim.id))
        success = result["status"] == "SUCCESS"
        payout = Payout(
            claim_id=claim.id,
            worker_id=claim.worker_id,
            amount=claim.amount,
            upi_id=upi_id,
            upi_ref=result.get("utr") if success else None,
            gateway="upi",
            status="completed" if success else "failed",
            completed_at=datetime.utcnow() if success else None,
            failure_reason=result.get("error") if not success else None,
        )
    else:
        from integrations.razorpay_mock import initiate_transfer as rp_transfer
        result = rp_transfer(upi_id, float(claim.amount), str(claim.id))
        success = result["status"] == "processed"
        payout = Payout(
            claim_id=claim.id,
            worker_id=claim.worker_id,
            amount=claim.amount,
            upi_id=upi_id,
            razorpay_ref=result.get("razorpay_ref") if success else None,
            gateway="razorpay",
            status="completed" if success else "failed",
            completed_at=datetime.utcnow() if success else None,
            failure_reason=result.get("reason") if not success else None,
        )

    db.add(payout)

    if success:
        claim.status = "approved"
    else:
        claim.status = "pending"
        claim.review_reason = f"Payout failed: {result.get('reason') or result.get('error')}"

    db.commit()
    db.refresh(payout)

    if success and worker:
        from services.notification_service import notify_worker_claim_approved
        notify_worker_claim_approved(worker, claim, payout)

    return payout
