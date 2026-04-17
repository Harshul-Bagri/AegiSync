"""
UPI Push Payment Simulator.

Simulates a direct UPI push payment (IMPS/UPI rails) with a realistic UTR
reference, 200 ms network latency, and a 97% success rate.

Success response shape:
    {"status": "SUCCESS", "utr": "UPI123456789012", "vpa": upi_id,
     "amount": amount, "timestamp": "2026-04-17T16:44:00.123456"}

Failure response shape:
    {"status": "FAILED", "error": "PAYEE_VPA_INVALID", "vpa": upi_id}
"""

import random
import time
from datetime import datetime


# UPI handle suffixes that are routed through this simulator
UPI_HANDLES = frozenset({"@upi", "@okaxis", "@ybl", "@paytm", "@ibl"})


def is_upi_handle(upi_id: str) -> bool:
    """Return True if *upi_id* ends with a known UPI handle suffix."""
    lower = upi_id.lower()
    return any(lower.endswith(handle) for handle in UPI_HANDLES)


def _generate_utr() -> str:
    """Generate a realistic 12-digit UPI Transaction Reference."""
    digits = "".join(str(random.randint(0, 9)) for _ in range(12))
    return f"UPI{digits}"


def initiate_transfer(upi_id: str, amount: float, claim_id: str) -> dict:
    """
    Simulate a UPI push payment.

    Args:
        upi_id:   Beneficiary Virtual Payment Address (VPA).
        amount:   Amount in INR (float).
        claim_id: Claim UUID string — used for idempotency logging.

    Returns:
        A dict with either status="SUCCESS" or status="FAILED".
    """
    time.sleep(0.2)  # simulate 200 ms UPI network latency

    if random.random() < 0.97:  # 97 % success rate
        return {
            "status": "SUCCESS",
            "utr": _generate_utr(),
            "vpa": upi_id,
            "amount": amount,
            "timestamp": datetime.utcnow().isoformat(),
        }

    return {
        "status": "FAILED",
        "error": "PAYEE_VPA_INVALID",
        "vpa": upi_id,
    }
