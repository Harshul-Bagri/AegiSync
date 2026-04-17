import random
import sys
import os
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from config import settings
from models.claim import Claim
from models.disruption import Disruption
from models.policy import Policy
from models.worker import Worker

# Ensure ml/ is importable from services/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@dataclass
class FraudResult:
    bas_score: float           # 0-100; higher = more authentic worker behaviour
    fraud_score: float         # 0-100; higher = more suspicious
    ring_signals: list = field(default_factory=list)  # list of signal name strings
    fraud_flags: list = field(default_factory=list)   # list of detail strings
    recommendation: str = "approve"                   # approve | manual_review | reject
    fraud_method: str | None = None                   # gps_spoofing | weather_mismatch | ring_signal


# -- BAS helpers --------------------------------------------------------------

def _mock_telemetry(simulate_fraud: bool) -> dict:
    """Generate realistic mock device telemetry for a worker during a disruption."""
    if simulate_fraud:
        # Suspiciously clean: worker is at home pretending to be outside.
        # GPS is impossibly precise (no multipath from rain), stays still,
        # and a known fake-GPS provider is often present.
        return {
            "gps_quality": random.uniform(0.85, 0.98),
            "network_stability": random.uniform(0.88, 0.99),
            "motion_score": random.uniform(0.02, 0.10),
            "battery_state": random.uniform(0.85, 0.99),
            "app_interactions": random.randint(0, 2),
            # GPS spoof fields
            "hdop": random.uniform(0.3, 1.2),               # too precise for storm conditions
            "location_jump_m": random.uniform(650, 1800),   # impossible jump in 30s
            "mock_provider_present": random.random() > 0.35,
        }
    # Normal: heavily degraded signals consistent with a real disruption.
    # Rain/storms: GPS drops sharply (multipath), cell towers overloaded (bad network),
    # worker is actively moving (trying to complete deliveries), battery drains fast.
    return {
        "gps_quality": random.uniform(0.25, 0.60),
        "network_stability": random.uniform(0.20, 0.50),
        "motion_score": random.uniform(0.65, 0.90),
        "battery_state": random.uniform(0.20, 0.60),
        "app_interactions": random.randint(10, 20),
        # GPS spoof fields — normal storm values
        "hdop": random.uniform(3.5, 12.0),                  # degraded by rain/interference
        "location_jump_m": random.uniform(40, 380),         # realistic delivery movement
        "mock_provider_present": False,
    }


def _compute_bas(t: dict) -> float:
    """
    Compute Behavioural Authenticity Score (0-100).
    High GPS quality + stable network + low motion = suspicious -> low BAS.
    Degraded GPS + spotty network + active motion = genuine -> high BAS.
    Weights: motion (0.35) is the primary discriminator — genuine workers move.
    """
    authenticity = (
        (1 - t["gps_quality"]) * 0.25
        + (1 - t["network_stability"]) * 0.25
        + t["motion_score"] * 0.35
        + (1 - t["battery_state"]) * 0.10
        + min(t["app_interactions"], 20) / 20 * 0.05
    )
    return round(authenticity * 100, 2)


# -- Phase 3: GPS spoofing detection ------------------------------------------

def gps_spoof_detector(telemetry: dict) -> tuple[list[str], int]:
    """
    Detect GPS spoofing from device telemetry.
    Returns (fraud_flag_strings, score_boost).
    Boost of 25 applies only when 2+ spoof signals are present simultaneously.
    """
    _KNOWN_FAKE_PROVIDERS = [
        "com.lexa.fakegps",
        "com.incorporateapps.fakegps",
        "dev.faking.location",
    ]
    spoof_signals = []

    hdop = telemetry.get("hdop", 99.0)
    if hdop < 1.5:
        spoof_signals.append(
            f"HDOP {hdop:.2f} — GPS precision implausibly high for reported storm "
            f"conditions (genuine outdoor signal degraded by rain typically > 3.0)"
        )

    jump = telemetry.get("location_jump_m", 0)
    if jump > 500:
        spoof_signals.append(
            f"Location jump {jump:.0f}m in <30s — physically impossible movement, "
            "consistent with mock GPS provider switching coordinates"
        )

    if telemetry.get("mock_provider_present", False):
        provider = random.choice(_KNOWN_FAKE_PROVIDERS)
        spoof_signals.append(
            f"Mock location provider detected on device (known fake GPS app: {provider})"
        )

    if len(spoof_signals) >= 2:
        return ["gps_spoofing_detected"] + spoof_signals, 25
    return [], 0


# -- Phase 3: Historical weather validation -----------------------------------

_CITY_COORDS: dict[str, tuple[float, float]] = {
    "Bengaluru": (12.9716, 77.5946),
    "Mumbai":    (19.0760, 72.8777),
    "Delhi":     (28.6139, 77.2090),
    "Chennai":   (13.0827, 80.2707),
    "Pune":      (18.5204, 73.8567),
    "Hyderabad": (17.3850, 78.4867),
}

_RAINFALL_THRESHOLD_MM = 15.0  # moderate disruption threshold (matches trigger_monitor)


def weather_claim_validator(disruption: Disruption, city: str) -> tuple[list[str], int]:
    """
    For rainfall/AQI claims: verify historical weather confirms the event existed.
    Returns (fraud_flag_strings, score_boost).
    """
    if disruption.type not in ("rainfall", "aqi"):
        return [], 0

    confirmed = _check_historical_weather(disruption, city)
    if confirmed:
        return [], 0

    return [
        f"No historical weather event found for {city} at disruption time "
        f"({disruption.started_at.strftime('%Y-%m-%d %H:%M UTC')}) — "
        f"claimed {disruption.type} disruption not corroborated by archived weather records"
    ], 30


def _check_historical_weather(disruption: Disruption, city: str) -> bool:
    """Returns True if historical weather data confirms the disruption existed."""
    import httpx as _httpx

    if not settings.openweathermap_api_key:
        return _mock_weather_validation()

    coords = _CITY_COORDS.get(city)
    if not coords:
        return True  # Unknown city — don't penalise

    lat, lon = coords
    timestamp = int(disruption.started_at.timestamp())

    try:
        resp = _httpx.get(
            "https://api.openweathermap.org/data/2.5/onecall/timemachine",
            params={
                "lat": lat, "lon": lon, "dt": timestamp,
                "appid": settings.openweathermap_api_key, "units": "metric",
            },
            timeout=6.0,
        )
        if resp.status_code != 200:
            return True  # API error — don't penalise
        data = resp.json()
        hourly = data.get("hourly", [])
        if disruption.type == "rainfall":
            for h in hourly:
                rain_mm = h.get("rain", {}).get("1h", 0.0)
                if rain_mm >= _RAINFALL_THRESHOLD_MM:
                    return True
            return False
        elif disruption.type == "aqi":
            # OWM timemachine doesn't include AQI — defer to mock logic
            return _mock_weather_validation()
    except Exception:
        return True  # Network error — don't penalise

    return False


def _mock_weather_validation() -> bool:
    """SIMULATE_FRAUD=true → weather didn't match (flag it). Otherwise → confirmed."""
    return not settings.simulate_fraud


# -- Syndicate signal detectors -----------------------------------------------

def _signal_temporal_clustering(
    worker: Worker, disruption: Disruption, db: Session
) -> tuple:
    """Flag if > 15% of workers in the city filed claims in the last 4 minutes."""
    cutoff = datetime.utcnow() - timedelta(minutes=4)
    recent_count = (
        db.query(Claim)
        .filter(
            Claim.disruption_id == disruption.id,
            Claim.created_at >= cutoff,
        )
        .count()
    )
    total_workers = (
        db.query(Worker).filter(Worker.city == disruption.city).count()
    )
    if total_workers > 0 and (recent_count / total_workers) > 0.15:
        return True, (
            f"{recent_count} claims filed in last 4 min across {disruption.city} "
            f"({recent_count}/{total_workers} workers = "
            f"{recent_count/total_workers*100:.0f}%) -- possible coordinated fraud"
        )
    return False, ""


def _signal_platform_order_inversion(
    worker: Worker, disruption: Disruption
) -> tuple:
    """Flag if platform shows normal order flow during a severe/extreme disruption."""
    if disruption.severity not in ("severe", "extreme"):
        return False, ""
    from integrations.platform_mock import get_zone_order_rate
    data = get_zone_order_rate(disruption.city)
    if data.get("order_rate_normal"):
        return True, (
            f"Platform order rate normal in {disruption.city} despite "
            f"{disruption.severity} {disruption.type} disruption -- "
            "orders flowing normally suggests disruption may not be impacting workers"
        )
    return False, ""


def _signal_velocity_anomaly(
    worker: Worker, policy: Policy, db: Session
) -> tuple:
    """Flag if worker already used >= max_days_per_week claims in the last 7 days."""
    cutoff = datetime.utcnow() - timedelta(days=7)
    recent = (
        db.query(Claim)
        .filter(
            Claim.worker_id == worker.id,
            Claim.created_at >= cutoff,
            Claim.status != "rejected",
        )
        .count()
    )
    if recent >= int(policy.max_days_per_week):
        return True, (
            f"Worker filed {recent} claims in last 7 days "
            f"(policy max: {policy.max_days_per_week}/week) -- velocity limit reached"
        )
    return False, ""


def _signal_cohort_registration_burst(
    worker: Worker, db: Session
) -> tuple:
    """Flag if >= 5 workers registered within +-24h of this worker (bulk sign-up pattern)."""
    window_start = worker.created_at - timedelta(hours=24)
    window_end = worker.created_at + timedelta(hours=24)
    cohort_count = (
        db.query(Worker)
        .filter(
            Worker.created_at >= window_start,
            Worker.created_at <= window_end,
            Worker.id != worker.id,
        )
        .count()
    )
    if cohort_count >= 5:
        return True, (
            f"{cohort_count} workers registered within 24h of this worker "
            f"(registered at {worker.created_at.strftime('%Y-%m-%d %H:%M')}) -- "
            "bulk registration pattern detected"
        )
    return False, ""


# -- Main evaluate function ---------------------------------------------------

def evaluate(
    worker: Worker,
    disruption: Disruption,
    policy: Policy,
    db: Session,
) -> FraudResult:
    """
    Run BAS scoring + 4 syndicate signal checks + Phase 3 GPS/weather detectors.
    Returns a FraudResult with bas_score, fraud_score, fraud_flags, and fraud_method.
    """
    telemetry = _mock_telemetry(simulate_fraud=settings.simulate_fraud)
    bas_score = _compute_bas(telemetry)

    # -- Syndicate signals --
    ring_signals = []
    fraud_flags = []

    checks = [
        ("temporal_clustering",
         _signal_temporal_clustering(worker, disruption, db)),
        ("platform_order_inversion",
         _signal_platform_order_inversion(worker, disruption)),
        ("velocity_anomaly",
         _signal_velocity_anomaly(worker, policy, db)),
        ("cohort_registration_burst",
         _signal_cohort_registration_burst(worker, db)),
    ]

    for signal_name, (triggered, detail) in checks:
        if triggered:
            ring_signals.append(signal_name)
            fraud_flags.append(detail)

    # Add a telemetry-derived flag when simulate_fraud is on (for UI clarity)
    if settings.simulate_fraud:
        flag_detail = (
            f"GPS signal quality {telemetry['gps_quality']*100:.0f}% -- "
            f"inconsistent with {disruption.severity} {disruption.type} conditions. "
            f"Network switched 0 times in 4 hours -- suggests indoor WiFi connection."
        )
        fraud_flags.append(flag_detail)

    # -- Phase 3: GPS spoofing detection --
    gps_flags, gps_boost = gps_spoof_detector(telemetry)
    fraud_flags.extend(gps_flags)

    # -- Phase 3: Historical weather validation --
    wx_flags, wx_boost = weather_claim_validator(disruption, worker.city)
    fraud_flags.extend(wx_flags)

    # -- Composite fraud score --
    from ml.fraud_detector import score_features

    # Zone claim rate (last 1 hour)
    recent_zone_claims = (
        db.query(Claim)
        .join(Worker, Worker.id == Claim.worker_id)
        .filter(
            Worker.city == disruption.city,
            Claim.created_at >= datetime.utcnow() - timedelta(hours=1),
        )
        .count()
    )
    total_zone_workers = max(
        1, db.query(Worker).filter(Worker.city == disruption.city).count()
    )
    zone_claim_rate = min(1.0, recent_zone_claims / total_zone_workers)

    # Claim velocity fraction (claims this week / max allowed)
    recent_7d = (
        db.query(Claim)
        .filter(
            Claim.worker_id == worker.id,
            Claim.created_at >= datetime.utcnow() - timedelta(days=7),
            Claim.status != "rejected",
        )
        .count()
    )
    max_days = int(policy.max_days_per_week) if policy.max_days_per_week else 1
    velocity_fraction = min(1.0, recent_7d / max_days)

    platform_normal = 1.0 if _signal_platform_order_inversion(worker, disruption)[0] else 0.0

    feature_vec = [
        telemetry["gps_quality"],
        telemetry["network_stability"],
        telemetry["motion_score"],
        telemetry["battery_state"],
        float(telemetry["app_interactions"]),
        velocity_fraction,
        zone_claim_rate,
        platform_normal,
    ]

    model_score = score_features(feature_vec)
    # 8 pts per ring signal keeps normal mass-disruption claims below auto-approve threshold
    signal_boost = len(ring_signals) * 8.0
    # simulate_fraud adds a large boost so fraud claims reliably land in the queue
    if settings.simulate_fraud:
        signal_boost += 35.0
    fraud_score = round(min(100.0, model_score + signal_boost + gps_boost + wx_boost), 2)

    recommendation = (
        "approve" if fraud_score < 35
        else "manual_review" if fraud_score < 70
        else "reject"
    )

    # Determine primary detection method for the fraud_method badge
    if "gps_spoofing_detected" in fraud_flags:
        fraud_method = "gps_spoofing"
    elif wx_boost > 0:
        fraud_method = "weather_mismatch"
    elif ring_signals:
        fraud_method = "ring_signal"
    else:
        fraud_method = None

    return FraudResult(
        bas_score=bas_score,
        fraud_score=fraud_score,
        ring_signals=ring_signals,
        fraud_flags=fraud_flags,
        recommendation=recommendation,
        fraud_method=fraud_method,
    )
