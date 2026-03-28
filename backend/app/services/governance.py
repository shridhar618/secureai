"""
Response Filtering Engine — Core Innovation
Implements RBAC + NRL (Need-to-Read Logic) filtering.
"""

import re
from dataclasses import dataclass
from typing import Optional

# ---------------------------------------------------------------------------
# Sensitivity rule sets per role
# ---------------------------------------------------------------------------

INTERN_BLOCKED_KEYWORDS = [
    r"\bsalary\b", r"\bsalaries\b", r"\bcompensation\b", r"\bpay\s*scale\b",
    r"\bpassword\b", r"\bcredential", r"\bsecret\b", r"\bapi[_\s]?key\b",
    r"\bconfidential\b", r"\bproprietary\b", r"\bssn\b", r"\bsocial\s*security\b",
    r"\bcredit\s*card\b", r"\bbank\s*account\b", r"\bprivate\s*key\b",
    r"\binternal\s*only\b", r"\bclassified\b",
]

HR_MASKED_PATTERNS = [
    # Emails
    (r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", "[EMAIL REDACTED]"),
    # Phone numbers
    (r"\b(\+?\d[\d\s\-().]{7,}\d)\b", "[PHONE REDACTED]"),
    # SSN-like
    (r"\b\d{3}-\d{2}-\d{4}\b", "[SSN REDACTED]"),
    # Credit cards
    (r"\b(?:\d[ -]?){13,16}\b", "[CARD REDACTED]"),
    # Salary figures
    (r"\$[\d,]+(?:\.\d{2})?(?:\s*(?:k|K|thousand|million|billion))?\b", "[AMOUNT REDACTED]"),
    # Passwords inline
    (r"(?i)password\s*[:=]\s*\S+", "password: [REDACTED]"),
]

RISK_KEYWORDS = [
    "hack", "exploit", "bypass", "inject", "phishing", "malware",
    "ransomware", "ddos", "vulnerability", "zero-day", "credential",
    "dump", "brute force", "exfiltrate",
]


@dataclass
class FilterResult:
    filtered_response: str
    status: str  # "allowed" | "filtered" | "blocked"
    risk_score: float
    reason: Optional[str] = None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def apply_governance(response: str, query: str, role: str) -> FilterResult:
    """
    Main entry point for the governance layer.
    Applies role-based filtering and risk scoring.
    """
    risk_score = _compute_risk_score(query, response)

    if role == "intern":
        return _filter_intern(response, risk_score)
    elif role == "hr":
        return _filter_hr(response, risk_score)
    else:
        # Admin — full access, still score risk
        return FilterResult(
            filtered_response=response,
            status="allowed",
            risk_score=risk_score,
        )


# ---------------------------------------------------------------------------
# Role-specific filters
# ---------------------------------------------------------------------------

def _filter_intern(response: str, risk_score: float) -> FilterResult:
    """Interns: block entire response if any sensitive keyword found."""
    for pattern in INTERN_BLOCKED_KEYWORDS:
        if re.search(pattern, response, re.IGNORECASE):
            return FilterResult(
                filtered_response=(
                    "⛔ Access Restricted: You are not authorized to view this information. "
                    "This response contains sensitive data that requires elevated permissions."
                ),
                status="blocked",
                risk_score=max(risk_score, 0.8),
                reason=f"Blocked keyword matched: {pattern}",
            )
    return FilterResult(
        filtered_response=response,
        status="allowed",
        risk_score=risk_score,
    )


def _filter_hr(response: str, risk_score: float) -> FilterResult:
    """HR: mask PII/sensitive patterns but allow the rest."""
    masked = response
    was_masked = False
    for pattern, replacement in HR_MASKED_PATTERNS:
        new_masked, count = re.subn(pattern, replacement, masked, flags=re.IGNORECASE)
        if count > 0:
            was_masked = True
            masked = new_masked

    status = "filtered" if was_masked else "allowed"
    return FilterResult(
        filtered_response=masked,
        status=status,
        risk_score=risk_score,
        reason="PII data masked per HR policy" if was_masked else None,
    )


# ---------------------------------------------------------------------------
# Risk scoring (lightweight ML-style heuristic)
# ---------------------------------------------------------------------------

def _compute_risk_score(query: str, response: str) -> float:
    """
    Lightweight risk scorer: 0.0 (safe) → 1.0 (high risk).
    Combines keyword hits + length heuristics.
    """
    combined = (query + " " + response).lower()
    hits = sum(1 for kw in RISK_KEYWORDS if kw in combined)
    keyword_score = min(hits / max(len(RISK_KEYWORDS), 1), 1.0)

    # Penalise very long responses slightly (data exfil risk)
    length_score = min(len(response) / 5000, 0.3)

    return round(min(keyword_score * 0.7 + length_score * 0.3, 1.0), 3)