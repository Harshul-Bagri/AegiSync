from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class ClaimOut(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    worker_id: UUID
    policy_id: UUID
    disruption_id: UUID
    status: str
    claim_type: str
    hours_lost: Optional[float] = None
    amount: float
    fraud_score: Optional[float] = None
    bas_score: Optional[float] = None
    fraud_flags: Optional[list] = None
    fraud_method: Optional[str] = None
    review_reason: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    auto_approved: bool
    created_at: datetime

    # Joined worker fields (populated in admin views)
    worker_name: Optional[str] = None
    worker_city: Optional[str] = None
    worker_phone: Optional[str] = None
    payout_gateway: Optional[str] = None


class PayoutOut(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    claim_id: UUID
    worker_id: UUID
    amount: float
    upi_id: str
    razorpay_ref: Optional[str] = None
    upi_ref: Optional[str] = None
    gateway: str = "razorpay"
    status: str
    initiated_at: datetime
    completed_at: Optional[datetime] = None
    failure_reason: Optional[str] = None


class RejectRequest(BaseModel):
    reason: str


class ApproveResponse(BaseModel):
    claim: ClaimOut
    payout: PayoutOut
