# ZeroTrustGuard — Risk Engine v2

## Overview
The ZeroTrustGuard Risk Engine evaluates every contextual user interaction (file views, downloads, uploads, access requests) and generates a real-time risk score between 0 and 100.

The core guiding principle is **"Never trust, always verify"**. Access decisions are calculated dynamically based on contextual signals relative to personal and systemic baselines, rather than blindly relying on static tokens or RBAC checks alone.

---

## The 6 Multi-Context Signals

The risk engine runs six independent, parallelized evaluations. Each signal returns a normalized 0-100 score which is weighted against a master matrix.

| Signal | Mathematical Weight | Description & Methodology |
|--------|----------------------|---------------------------|
| **Sensitivity × Role** | `25%` | Checks the static sensitivity level of the resource (`low`, `high`, `critical`) against the `clearance` level of the actor's role. A senior accessing a critical file scores moderately; an intern attempting the same triggers an immediate extreme penalty. |
| **Temporal Anomaly** | `20%` | Uses a cosine-falloff gradient. Safe hours are `08:00 - 19:00` local server time. The risk increases on a steep curve towards `03:00 am`. Weekends trigger an automatic flat uplift. |
| **IP Novelty** | `20%` | Compares the request IP against the user's last 50 historical logs. A first-time external IP is severely penalized unless the user has an existing high "roaming distance" (diversity factor) in their history. Localhost and `192.168.x` internal ranges bypass the penalty. |
| **Velocity (Burst)** | `15%` | Measures sudden action bursts over a 5-minute sliding window against a rolling 7-day average baseline strictly tied to the individual user. Detects automated exfiltration or scraping attempts. |
| **Department Mismatch** | `12%` | Triggers a penalty heavily governed by file sensitivity if the actor attempts access across segmented departments (e.g., IT attempting to view an HR file), regardless of explicit `target_department` allowances. |
| **Recent Failures** | `8%` | Analyzes systemic failure events (Login failures, MFA failures, WAF blocks) occurring exclusively within the trailing 30-minute window for the actor. |

---

## Decision Capabilities

Risk scores are grouped into bounded tiers that govern the engine's real-time authorization verdict:

| Tier | Score Range | Decision Output | Result on Resource |
|------|-------------|-----------------|--------------------|
| **Trust** | `0 - 29` | `ALLOW` | Access granted immediately based on standard RBAC and temporary access validity. |
| **Challenge** | `30 - 64` | `MFA_REQUIRED` | The API immediately fails the request and challenges the client for a secondary authentication layer. |
| **Warning** | `65 - 84` | `REVIEW` | Access requires MFA challenge. Generates a high-priority push-alert / WebSocket event to the SOC Dashboard but doesn't hard-block the user. |
| **Violation** | `85 - 100` | `BLOCK` | Total failure block. Flags the API call down and auto-revokes the JWT token context. |

---

## Architectural Notes

### 1. Zero Trust Context
The `computeRisk()` interface now leverages the full Zero Trust context matrix via the controllers:
```javascript
const riskPayload = await computeRisk({
  userId:           req.user.id,
  action:           "file_download",
  sensitivityLevel: targetFile.sensitivityLevel,
  userRole:         req.user.role,
  userDepartment:   req.user.department,
  fileDepartment:   targetFile.target_department,
  ipAddress:        req.ip
});
```

### 2. Live Insights & Explainability
Rather than storing a flat `riskScore=63`, every engine calculation outputs the full component breakdown for explainability:
```json
{
  "riskScore": 63,
  "decision": "MFA_REQUIRED",
  "signals": {
    "sensitivityMismatch": 100,
    "temporalAnomaly": 50,
    "ipAnomaly": 72,
    "velocityAnomaly": 0,
    "departmentMismatch": 60,
    "recentFailures": 80
  }
}
```
This is directly propagated to the `ActivityLogs` table, providing immediate traceability for the Security Operations Center.
