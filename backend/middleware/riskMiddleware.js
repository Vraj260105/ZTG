/**
 * riskMiddleware.js
 *
 * Global Zero Trust risk scoring middleware.
 * Applied to every authenticated route group.
 *
 * Flow:
 *   computeRisk() → ALLOW / REVIEW / BLOCK
 *   BLOCK  → 403 + SOC Alert (fire-and-forget) + blocked:true in body
 *   REVIEW → SOC Alert (fire-and-forget) + request continues
 *   ALLOW  → req.riskScore / req.riskDecision / req.riskSignals attached for controllers
 *
 * Note: fileController calls computeRisk() AGAIN with richer file context
 * (sensitivityLevel, fileDepartment) — that score overrides this one for file logs.
 * This middleware covers all other routes (dashboard, users, MFA, SOC, etc.)
 */

"use strict";

const { computeRisk } = require("../services/riskEngine");
const { createAlert } = require("../services/alertService");

// Derive a meaningful action label from the HTTP method + path
function deriveAction(req) {
  const p = req.path.toLowerCase();
  const m = req.method;
  if (p.includes("download"))      return "file_download";
  if (p.includes("view"))          return "file_view";
  if (p.includes("upload") || (p.includes("files") && m === "POST")) return "file_upload";
  if (p.includes("access-request")) return "access_request";
  if (p.includes("login"))         return "login";
  return "generic";
}

module.exports = async (req, res, next) => {
  // Skip if no authenticated user (pre-auth paths like /api/auth)
  if (!req.user) return next();

  try {
    const { riskScore, decision, signals } = await computeRisk({
      userId:   req.user.id,
      action:   deriveAction(req),
      userRole: req.user.role,
      ipAddress: req.ip,
      // sensitivityLevel & fileDepartment: left at defaults (low / null)
      // fileController enriches these with actual file context when needed
    });

    // Attach to request — controllers and ActivityLog calls can read these
    req.riskScore    = riskScore;
    req.riskDecision = decision;
    req.riskSignals  = signals;

    if (decision === "BLOCK") {
      // Fire-and-forget — never await; engine failure must not block legitimate requests
      createAlert({
        userId:    req.user.id,
        riskScore,
        reason:    `[BLOCKED] ${req.method} ${req.originalUrl} — Risk: ${riskScore}/100`,
        status:    "OPEN",
      }).catch(() => {});

      return res.status(403).json({
        message:  "Access denied. Your current risk score is too high for this action. Contact your administrator.",
        riskScore,
        decision,
        blocked:  true,  // frontend reads this flag to show the destructive toast
      });
    }

    if (decision === "REVIEW") {
      createAlert({
        userId:    req.user.id,
        riskScore,
        reason:    `[REVIEW] ${req.method} ${req.originalUrl} — Risk: ${riskScore}/100`,
        status:    "OPEN",
      }).catch(() => {});
      // Request continues — SOC sees it, user does not
    }

    next();
  } catch (err) {
    // Risk engine failure MUST NOT block a legitimate request
    console.error("[riskMiddleware] Scoring error:", err.message);
    next();
  }
};
