from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


class QuoteRequest(BaseModel):
    city: str
    zone: str


class TierQuote(BaseModel):
    tier: str
    base_premium: float
    zone_risk_score: float
    seasonal_factor: float
    claim_history_factor: float
    weekly_premium: float
    daily_coverage_cap: float
    max_days_per_week: int
    max_hours_per_day: int


class QuoteResponse(BaseModel):
    basic: TierQuote
    standard: TierQuote
    premium: TierQuote


class ActivateRequest(BaseModel):
    tier: str  # "basic" | "standard" | "premium"


class PolicyOut(BaseModel):
    id: str
    worker_id: str
    tier: str
    weekly_premium: float
    base_premium: float
    coverage_per_day: float
    max_days_per_week: int
    max_hours_per_day: int
    status: str
    start_date: date
    zone_risk_score: Optional[float] = None
    seasonal_factor: Optional[float] = None
    claim_history_factor: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True
