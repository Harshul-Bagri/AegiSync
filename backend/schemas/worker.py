from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from schemas.policy import PolicyOut


class WorkerCreate(BaseModel):
    name: str
    phone: str = Field(..., min_length=10, max_length=15)
    email: Optional[str] = None
    city: str
    zone: str
    pincode: str
    platform: str                    # "zomato" or "swiggy"
    platform_id: Optional[str] = None
    upi_id: str
    avg_daily_earning: float = Field(..., ge=100, le=5000)
    years_active: int = Field(0, ge=0, le=30)
    tier: Optional[str] = None       # if provided, auto-create policy on register


class WorkerUpdate(BaseModel):
    upi_id: Optional[str] = None
    avg_daily_earning: Optional[float] = Field(None, ge=100, le=5000)
    zone: Optional[str] = None


class ClaimSummary(BaseModel):
    id: str
    status: str
    claim_type: str
    amount: float
    hours_lost: Optional[float] = None
    fraud_score: Optional[float] = None
    auto_approved: bool
    created_at: datetime


class WorkerResponse(BaseModel):
    id: str
    name: str
    phone: str
    email: Optional[str] = None
    city: str
    zone: str
    pincode: str
    platform: str
    platform_id: Optional[str] = None
    upi_id: str
    avg_daily_earning: float
    years_active: int
    risk_score: Optional[float] = None
    is_verified: bool
    created_at: datetime
    suggested_premiums: Dict[str, Any]   # all 3 tier quotes
    policy: Optional[PolicyOut] = None   # populated if tier was given on register


class WorkerMe(BaseModel):
    id: str
    name: str
    phone: str
    city: str
    zone: str
    platform: str
    upi_id: str
    avg_daily_earning: float
    risk_score: Optional[float] = None
    is_verified: bool
    created_at: datetime
    policy: Optional[PolicyOut] = None
    recent_claims: List[ClaimSummary]
    total_earnings_protected: float
