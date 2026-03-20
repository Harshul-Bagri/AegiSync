from sqlalchemy.orm import Session

from services.premium_engine import get_zone_risk


def compute_zone_risk(city: str, zone: str, db: Session) -> float:
    """Returns zone risk multiplier (0.70–1.40) from zone_risk_profiles table."""
    return get_zone_risk(city, zone, db)
