"""
Seed script — wipes and repopulates the aegisync database with realistic demo data.
Run: python seed.py
"""
import uuid
import random
from datetime import datetime, timedelta, date

from database import SessionLocal
from models import Worker, Policy, Disruption, Claim, Payout, ZoneRiskProfile

# ── helpers ────────────────────────────────────────────────────────────────────

def rand_upi(name: str) -> str:
    handle = name.lower().replace(" ", "")[:8]
    banks = ["okaxis", "okhdfcbank", "okicici", "oksbi", "paytm", "ybl"]
    return f"{handle}{random.randint(10,99)}@{random.choice(banks)}"


def rand_phone() -> str:
    return f"9{random.randint(100000000, 999999999)}"


def rand_platform_id(platform: str) -> str:
    prefix = "ZOM" if platform == "zomato" else "SWG"
    return f"{prefix}{random.randint(100000, 999999)}"


TIER_CONFIG = {
    "basic":    {"base": 79,  "coverage": 400, "max_days": 2, "max_hours": 4},
    "standard": {"base": 129, "coverage": 650, "max_days": 3, "max_hours": 6},
    "premium":  {"base": 199, "coverage": 900, "max_days": 5, "max_hours": 8},
}

SEASONAL_FACTORS = {
    1: 1.05, 2: 1.0, 3: 1.0, 4: 1.02, 5: 1.05,
    6: 1.15, 7: 1.20, 8: 1.18, 9: 1.12,
    10: 1.05, 11: 1.10, 12: 1.08,
}


def calc_premium(tier: str, zone_risk: float) -> float:
    seasonal = SEASONAL_FACTORS[datetime.now().month]
    return round(TIER_CONFIG[tier]["base"] * zone_risk * seasonal, 2)


def to_float(val) -> float:
    """Convert Decimal or float to float safely."""
    return float(val)


# ── zone risk look-up (matches pre-seeded zone_risk_profiles) ──────────────────

ZONE_RISKS = {
    ("Bengaluru", "Koramangala"): 1.28,
    ("Bengaluru", "Indiranagar"): 1.10,
    ("Bengaluru", "Whitefield"):  0.92,
    ("Bengaluru", "BTM Layout"):  1.30,
    ("Mumbai",    "Andheri West"): 1.38,
    ("Mumbai",    "Bandra"):       1.25,
    ("Mumbai",    "Powai"):        1.12,
    ("Delhi",     "Dwarka"):       1.25,
    ("Delhi",     "Lajpat Nagar"): 1.22,
    ("Delhi",     "Rohini"):       1.15,
    ("Chennai",   "T Nagar"):      1.18,
    ("Chennai",   "Velachery"):    1.32,
    ("Pune",      "Kothrud"):      0.98,
    ("Pune",      "Hadapsar"):     1.08,
    ("Hyderabad", "Banjara Hills"): 0.97,
    ("Hyderabad", "LB Nagar"):     1.16,
}

# ── worker definitions (20 workers, 4 cities) ──────────────────────────────────

WORKER_DEFS = [
    # Bengaluru — 6 workers
    ("Rajesh Kumar",      "Bengaluru", "Koramangala", "560034", "swiggy",  700),
    ("Arun Sharma",       "Bengaluru", "Koramangala", "560034", "zomato",  850),
    ("Suresh Nair",       "Bengaluru", "Koramangala", "560034", "swiggy",  600),
    ("Kiran Rao",         "Bengaluru", "Indiranagar", "560038", "zomato",  920),
    ("Deepak Verma",      "Bengaluru", "Indiranagar", "560038", "swiggy",  780),
    ("Mohan Gowda",       "Bengaluru", "BTM Layout",  "560076", "zomato",  650),
    # Mumbai — 5 workers
    ("Priya Singh",       "Mumbai",    "Andheri West","400058", "swiggy",  1100),
    ("Ramesh Patil",      "Mumbai",    "Andheri West","400058", "zomato",  950),
    ("Santosh Jadhav",    "Mumbai",    "Andheri West","400058", "swiggy",  880),
    ("Vijay Shinde",      "Mumbai",    "Bandra",       "400050", "zomato", 1050),
    ("Amol Deshmukh",     "Mumbai",    "Bandra",       "400050", "swiggy",  760),
    # Delhi — 5 workers
    ("Meena Kumari",      "Delhi",     "Dwarka",       "110075", "zomato",  800),
    ("Rohit Yadav",       "Delhi",     "Dwarka",       "110075", "swiggy",  720),
    ("Sanjay Gupta",      "Delhi",     "Dwarka",       "110075", "zomato",  900),
    ("Pooja Sharma",      "Delhi",     "Lajpat Nagar","110024", "swiggy",  850),
    ("Aakash Tiwari",     "Delhi",     "Lajpat Nagar","110024", "zomato",  680),
    # Chennai — 4 workers
    ("Murugan Pillai",    "Chennai",   "T Nagar",      "600017", "swiggy",  750),
    ("Kavitha Devi",      "Chennai",   "T Nagar",      "600017", "zomato",  820),
    ("Selvam Rajan",      "Chennai",   "Velachery",    "600042", "swiggy",  690),
    ("Lakshmi Narayanan", "Chennai",   "Velachery",    "600042", "zomato",  940),
]

TIERS = ["basic", "standard", "standard", "premium", "standard"]  # weighted mix


# ── main seed ─────────────────────────────────────────────────────────────────

def seed():
    db = SessionLocal()
    try:
        print("Clearing existing data…")
        db.query(Payout).delete()
        db.query(Claim).delete()
        db.query(Policy).delete()
        db.query(Disruption).delete()
        db.query(Worker).delete()
        db.query(ZoneRiskProfile).delete()
        db.commit()

        # ── zone risk profiles ───────────────────────────────────────────────
        print("Seeding zone_risk_profiles…")
        zones = [
            ("Bengaluru", "Koramangala", "560034", 0.75, 0.35, 0.80, 0.20, 1.28),
            ("Bengaluru", "Indiranagar", "560038", 0.50, 0.35, 0.65, 0.20, 1.10),
            ("Bengaluru", "Whitefield",  "560066", 0.30, 0.40, 0.45, 0.15, 0.92),
            ("Bengaluru", "BTM Layout",  "560076", 0.80, 0.35, 0.75, 0.25, 1.30),
            ("Mumbai",    "Andheri West","400058", 0.85, 0.55, 0.90, 0.40, 1.38),
            ("Mumbai",    "Bandra",       "400050", 0.70, 0.55, 0.80, 0.35, 1.25),
            ("Mumbai",    "Powai",        "400076", 0.60, 0.50, 0.70, 0.20, 1.12),
            ("Delhi",     "Dwarka",       "110075", 0.40, 0.95, 0.50, 0.45, 1.25),
            ("Delhi",     "Lajpat Nagar","110024", 0.35, 0.90, 0.45, 0.55, 1.22),
            ("Delhi",     "Rohini",       "110085", 0.30, 0.92, 0.40, 0.35, 1.15),
            ("Chennai",   "T Nagar",      "600017", 0.65, 0.40, 0.70, 0.30, 1.18),
            ("Chennai",   "Velachery",    "600042", 0.85, 0.40, 0.85, 0.25, 1.32),
            ("Pune",      "Kothrud",      "411038", 0.35, 0.45, 0.50, 0.30, 0.98),
            ("Pune",      "Hadapsar",     "411028", 0.50, 0.45, 0.60, 0.35, 1.08),
            ("Hyderabad", "Banjara Hills","500034", 0.40, 0.50, 0.55, 0.20, 0.97),
            ("Hyderabad", "LB Nagar",     "500074", 0.65, 0.50, 0.70, 0.30, 1.16),
        ]
        for city, zone, pin, flood, aqi, rain, strike, overall in zones:
            db.add(ZoneRiskProfile(
                city=city, zone=zone, pincode=pin,
                flood_risk=flood, aqi_risk=aqi, rainfall_risk=rain,
                strike_risk=strike, overall_risk=overall,
            ))
        db.commit()

        # ── workers + policies ────────────────────────────────────────────────
        print("Seeding 20 workers and policies…")
        workers = []
        policies = []
        for i, (name, city, zone, pin, platform, daily_earn) in enumerate(WORKER_DEFS):
            w = Worker(
                name=name,
                phone=rand_phone(),
                email=f"{name.lower().replace(' ', '.')}{i}@example.com",
                city=city,
                zone=zone,
                pincode=pin,
                platform=platform,
                platform_id=rand_platform_id(platform),
                upi_id=rand_upi(name),
                avg_daily_earning=daily_earn,
                years_active=random.randint(0, 8),
                risk_score=ZONE_RISKS.get((city, zone), 1.10),
                is_verified=True,
            )
            db.add(w)
            db.flush()

            tier = TIERS[i % len(TIERS)]
            cfg = TIER_CONFIG[tier]
            zone_risk = ZONE_RISKS.get((city, zone), 1.10)
            premium = calc_premium(tier, zone_risk)
            p = Policy(
                worker_id=w.id,
                tier=tier,
                weekly_premium=premium,
                base_premium=cfg["base"],
                coverage_per_day=cfg["coverage"],
                max_days_per_week=cfg["max_days"],
                max_hours_per_day=cfg["max_hours"],
                status="active",
                start_date=date.today() - timedelta(days=random.randint(7, 60)),
                zone_risk_score=zone_risk,
                seasonal_factor=SEASONAL_FACTORS[datetime.now().month],
                claim_history_factor=1.0,
            )
            db.add(p)
            db.flush()
            workers.append(w)
            policies.append(p)

        db.commit()

        # ── 3 resolved historical disruptions ─────────────────────────────────
        print("Seeding 3 resolved disruptions…")
        now = datetime.utcnow()

        d_rain = Disruption(
            type="rainfall", city="Bengaluru", zone="Koramangala", severity="severe",
            trigger_value=48.5, threshold_value=35.0, api_source="OpenWeatherMap",
            started_at=now - timedelta(days=5, hours=4),
            ended_at=now - timedelta(days=5),
            is_active=False,
            evidence_json={"rain": {"3h": 48.5}, "city": "Bengaluru", "source": "OWM"},
        )
        d_aqi = Disruption(
            type="aqi", city="Delhi", zone=None, severity="extreme",
            trigger_value=278.0, threshold_value=250.0, api_source="OpenAQ",
            started_at=now - timedelta(days=10, hours=6),
            ended_at=now - timedelta(days=9, hours=18),
            is_active=False,
            evidence_json={"pm25": 278.0, "city": "Delhi", "source": "OpenAQ"},
        )
        d_outage = Disruption(
            type="outage", city="Mumbai", zone=None, severity="moderate",
            trigger_value=195.0, threshold_value=120.0, api_source="PlatformMock",
            started_at=now - timedelta(days=3, hours=3),
            ended_at=now - timedelta(days=3),
            is_active=False,
            evidence_json={"status": "degraded", "duration_minutes": 195, "city": "Mumbai"},
        )
        for d in [d_rain, d_aqi, d_outage]:
            db.add(d)
        db.commit()

        # ── 15 historical claims (against the 3 resolved disruptions) ──────────
        print("Seeding 15 historical claims…")

        # Workers in Bengaluru/Koramangala for the rainfall disruption
        blr_workers = [(w, p) for w, p in zip(workers, policies) if w.city == "Bengaluru" and w.zone == "Koramangala"]
        # Workers in Delhi for AQI disruption
        del_workers = [(w, p) for w, p in zip(workers, policies) if w.city == "Delhi"]
        # Workers in Mumbai for outage disruption
        mum_workers = [(w, p) for w, p in zip(workers, policies) if w.city == "Mumbai"]

        historical_claims = []

        # 7 approved (auto) — Bengaluru rainfall
        for w, p in blr_workers[:3]:
            hours = min(4.0, p.max_hours_per_day)
            amount = min(round((to_float(w.avg_daily_earning) / 8) * hours, 2), float(p.coverage_per_day))
            c = Claim(
                worker_id=w.id, policy_id=p.id, disruption_id=d_rain.id,
                status="approved", claim_type="rainfall",
                hours_lost=hours, amount=amount,
                fraud_score=round(random.uniform(10, 28), 2),
                bas_score=round(random.uniform(72, 92), 2),
                fraud_flags=[],
                auto_approved=True,
                created_at=d_rain.started_at + timedelta(minutes=random.randint(3, 12)),
            )
            db.add(c)
            db.flush()
            historical_claims.append((c, w))

        # 4 more approved (auto) — Delhi AQI + Mumbai outage
        for w, p in del_workers[:2]:
            hours = min(6.0, p.max_hours_per_day)
            amount = min(round((to_float(w.avg_daily_earning) / 8) * hours, 2), float(p.coverage_per_day))
            c = Claim(
                worker_id=w.id, policy_id=p.id, disruption_id=d_aqi.id,
                status="approved", claim_type="aqi",
                hours_lost=hours, amount=amount,
                fraud_score=round(random.uniform(8, 25), 2),
                bas_score=round(random.uniform(68, 88), 2),
                fraud_flags=[],
                auto_approved=True,
                created_at=d_aqi.started_at + timedelta(minutes=random.randint(3, 10)),
            )
            db.add(c)
            db.flush()
            historical_claims.append((c, w))

        for w, p in mum_workers[:2]:
            hours = min(3.0, p.max_hours_per_day)
            amount = min(round((to_float(w.avg_daily_earning) / 8) * hours, 2), float(p.coverage_per_day))
            c = Claim(
                worker_id=w.id, policy_id=p.id, disruption_id=d_outage.id,
                status="approved", claim_type="outage",
                hours_lost=hours, amount=amount,
                fraud_score=round(random.uniform(12, 30), 2),
                bas_score=round(random.uniform(70, 85), 2),
                fraud_flags=[],
                auto_approved=True,
                created_at=d_outage.started_at + timedelta(minutes=random.randint(5, 15)),
            )
            db.add(c)
            db.flush()
            historical_claims.append((c, w))

        # 3 manually approved (reviewed_by admin)
        for w, p in blr_workers[3:] + del_workers[2:3]:
            if not (w and p):
                continue
            hours = min(4.0, p.max_hours_per_day)
            amount = min(round((to_float(w.avg_daily_earning) / 8) * hours, 2), float(p.coverage_per_day))
            disruption = d_rain if w.city == "Bengaluru" else d_aqi
            c = Claim(
                worker_id=w.id, policy_id=p.id, disruption_id=disruption.id,
                status="approved", claim_type=disruption.type,
                hours_lost=hours, amount=amount,
                fraud_score=round(random.uniform(35, 55), 2),
                bas_score=round(random.uniform(55, 70), 2),
                fraud_flags=["network_switching_low"],
                auto_approved=False,
                reviewed_by="admin",
                reviewed_at=disruption.ended_at + timedelta(hours=2),
                created_at=disruption.started_at + timedelta(minutes=random.randint(5, 20)),
            )
            db.add(c)
            db.flush()
            historical_claims.append((c, w))

        # 5 rejected — fraud score high
        FRAUD_FLAG_SETS = [
            ["GPS signal quality 97% — inconsistent with extreme rainfall conditions",
             "Network switched 0 times in 6 hours — suggests indoor WiFi connection"],
            ["Motion score 0.02 — device stationary for entire disruption window",
             "temporal_clustering — 18% of zone claims arrived within 3-minute window"],
            ["platform_order_inversion — platform order rate normal during claimed disruption",
             "velocity_anomaly — 3 claims filed in past 7 days"],
            ["cohort_registration_burst — registered in same 48-hour window as 14 other claimants",
             "GPS signal quality 96% — too clean for outdoor storm conditions"],
            ["Motion score 0.01 — no movement detected",
             "Network stable on WiFi for full claim window",
             "velocity_anomaly — maximum weekly claims exceeded"],
        ]
        reject_pool = del_workers[3:] + mum_workers[3:]
        for idx, (w, p) in enumerate(reject_pool[:5]):
            hours = min(4.0, p.max_hours_per_day)
            amount = min(round((to_float(w.avg_daily_earning) / 8) * hours, 2), float(p.coverage_per_day))
            disruption = d_aqi if w.city == "Delhi" else d_outage
            c = Claim(
                worker_id=w.id, policy_id=p.id, disruption_id=disruption.id,
                status="rejected", claim_type=disruption.type,
                hours_lost=hours, amount=amount,
                fraud_score=round(random.uniform(75, 96), 2),
                bas_score=round(random.uniform(10, 40), 2),
                fraud_flags=FRAUD_FLAG_SETS[idx % len(FRAUD_FLAG_SETS)],
                auto_approved=False,
                review_reason="Fraud signals indicate worker was not in the disruption zone.",
                reviewed_by="admin",
                reviewed_at=disruption.ended_at + timedelta(hours=1),
                created_at=disruption.started_at + timedelta(minutes=random.randint(2, 8)),
            )
            db.add(c)

        db.commit()

        # ── payouts for all approved historical claims ─────────────────────────
        print("Seeding payouts for approved claims…")
        for c, w in historical_claims:
            ref = f"MOCK{uuid.uuid4().hex[:12].upper()}"
            payout = Payout(
                claim_id=c.id,
                worker_id=w.id,
                amount=c.amount,
                upi_id=w.upi_id,
                razorpay_ref=ref,
                status="completed",
                initiated_at=c.created_at + timedelta(seconds=30),
                completed_at=c.created_at + timedelta(minutes=2),
            )
            db.add(payout)
        db.commit()

        # ── 1 active disruption in Bengaluru/Koramangala ──────────────────────
        print("Seeding 1 active disruption (Bengaluru/Koramangala rainfall extreme)…")
        active_disruption = Disruption(
            type="rainfall", city="Bengaluru", zone="Koramangala", severity="extreme",
            trigger_value=72.5, threshold_value=60.0, api_source="OpenWeatherMap",
            started_at=now - timedelta(minutes=45),
            is_active=True,
            evidence_json={
                "rain": {"1h": 72.5}, "city": "Bengaluru",
                "description": "heavy intensity rain", "source": "OWM",
            },
        )
        db.add(active_disruption)
        db.commit()

        # ── 2 pending claims against active disruption ────────────────────────
        print("Seeding 2 pending claims against active disruption…")
        for w, p in blr_workers[:2]:
            hours_lost = min(6.0, p.max_hours_per_day)
            amount = min(round((to_float(w.avg_daily_earning) / 8) * hours_lost, 2), float(p.coverage_per_day))
            c = Claim(
                worker_id=w.id, policy_id=p.id, disruption_id=active_disruption.id,
                status="pending", claim_type="rainfall",
                hours_lost=hours_lost, amount=amount,
                fraud_score=round(random.uniform(18, 32), 2),
                bas_score=round(random.uniform(58, 74), 2),
                fraud_flags=[],
                auto_approved=False,
                created_at=active_disruption.started_at + timedelta(minutes=random.randint(2, 8)),
            )
            db.add(c)
        db.commit()

        # ── 1 manual_review claim with realistic fraud flags ──────────────────
        print("Seeding 1 manual_review claim…")
        w_fraud, p_fraud = blr_workers[2] if len(blr_workers) > 2 else (workers[0], policies[0])
        hours_lost = min(6.0, p_fraud.max_hours_per_day)
        amount = min(round((to_float(w_fraud.avg_daily_earning) / 8) * hours_lost, 2), float(p_fraud.coverage_per_day))
        fraud_claim = Claim(
            worker_id=w_fraud.id,
            policy_id=p_fraud.id,
            disruption_id=active_disruption.id,
            status="manual_review",
            claim_type="rainfall",
            hours_lost=hours_lost,
            amount=amount,
            fraud_score=68.0,
            bas_score=52.0,
            fraud_flags=[
                "GPS signal quality 94% — inconsistent with severe rainfall conditions",
                "Network switched 0 times in 4 hours — suggests indoor WiFi connection",
                "Motion score 0.03 — device stationary for entire disruption window",
            ],
            review_reason="Multiple behavioural signals inconsistent with outdoor storm conditions.",
            auto_approved=False,
            created_at=active_disruption.started_at + timedelta(minutes=5),
        )
        db.add(fraud_claim)
        db.commit()

        # ── summary ───────────────────────────────────────────────────────────
        print("\nSeed complete!")
        print(f"  zone_risk_profiles : {db.query(ZoneRiskProfile).count()}")
        print(f"  workers            : {db.query(Worker).count()}")
        print(f"  policies           : {db.query(Policy).count()}")
        print(f"  disruptions        : {db.query(Disruption).count()} ({db.query(Disruption).filter_by(is_active=True).count()} active)")
        print(f"  claims             : {db.query(Claim).count()}")
        for status in ["approved", "pending", "rejected", "manual_review"]:
            count = db.query(Claim).filter_by(status=status).count()
            print(f"    {status:<15}: {count}")
        print(f"  payouts            : {db.query(Payout).count()}")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
