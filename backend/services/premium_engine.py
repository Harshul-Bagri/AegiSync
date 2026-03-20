from datetime import datetime
from sqlalchemy.orm import Session

from models.zone_risk_profile import ZoneRiskProfile

TIER_CONFIG = {
    "basic":    {"base": 79,  "daily_cap": 400, "max_days": 2, "max_hours": 4},
    "standard": {"base": 129, "daily_cap": 650, "max_days": 3, "max_hours": 6},
    "premium":  {"base": 199, "daily_cap": 900, "max_days": 5, "max_hours": 8},
}

SEASONAL_FACTORS = {
    6: 1.15, 7: 1.20, 8: 1.18, 9: 1.12,
    10: 1.05, 11: 1.10, 12: 1.08,
    1: 1.05, 2: 1.0, 3: 1.0,
    4: 1.02, 5: 1.05,
}

CITY_DEFAULTS = {
    "Mumbai": 1.25, "Chennai": 1.20, "Delhi": 1.18,
    "Bengaluru": 1.15, "Hyderabad": 1.05, "Pune": 1.00,
}


def get_zone_risk(city: str, zone: str, db: Session) -> float:
    profile = (
        db.query(ZoneRiskProfile)
        .filter(ZoneRiskProfile.city == city, ZoneRiskProfile.zone == zone)
        .first()
    )
    if not profile or profile.overall_risk is None:
        return CITY_DEFAULTS.get(city, 1.10)
    return float(profile.overall_risk)


def calculate_premium(
    tier: str,
    city: str,
    zone: str,
    db: Session,
    claim_history_factor: float = 1.0,
) -> dict:
    config = TIER_CONFIG[tier]
    zone_risk = get_zone_risk(city, zone, db)
    seasonal = SEASONAL_FACTORS[datetime.now().month]
    weekly_premium = round(config["base"] * zone_risk * seasonal * claim_history_factor, 2)
    return {
        "tier": tier,
        "base_premium": config["base"],
        "zone_risk_score": zone_risk,
        "seasonal_factor": seasonal,
        "claim_history_factor": claim_history_factor,
        "weekly_premium": weekly_premium,
        "daily_coverage_cap": config["daily_cap"],
        "max_days_per_week": config["max_days"],
        "max_hours_per_day": config["max_hours"],
    }


def get_all_tier_quotes(city: str, zone: str, db: Session) -> dict:
    return {t: calculate_premium(t, city, zone, db) for t in ["basic", "standard", "premium"]}
