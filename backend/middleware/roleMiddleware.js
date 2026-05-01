/**
 * roleMiddleware.js
 *
 * Provides two role-check helpers:
 *
 *  requireRole(role)       — exact match (legacy, kept for compatibility)
 *  requireMinRole(minRole) — hierarchy-aware: allows the specified role AND
 *                            any role above it in the HIERARCHY array.
 *
 * Role hierarchy (lowest → highest):
 *   intern → staff → senior → admin → super_admin
 *
 * Usage:
 *   router.get("/admin-only", requireMinRole("admin"), handler);
 *   // This allows both "admin" and "super_admin"
 */

"use strict";

const HIERARCHY = ["intern", "staff", "senior", "admin", "super_admin"];

/**
 * Hierarchy-aware role check.
 * Grants access to minRole and every role above it.
 */
function requireMinRole(minRole) {
  return (req, res, next) => {
    const userLevel = HIERARCHY.indexOf(req.user?.role);
    const minLevel  = HIERARCHY.indexOf(minRole);

    if (userLevel === -1 || minLevel === -1) {
      return res.status(403).json({ message: "Access denied — unknown role." });
    }

    if (userLevel >= minLevel) return next();

    return res.status(403).json({ message: "Access denied — insufficient role." });
  };
}

/**
 * Exact role match (legacy — use requireMinRole for new routes).
 * NOTE: This blocks super_admin from admin-only routes. Prefer requireMinRole.
 */
function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ message: "Access denied — insufficient role." });
    }
    next();
  };
}

module.exports = requireRole;
module.exports.requireMinRole = requireMinRole;
module.exports.requireRole    = requireRole;