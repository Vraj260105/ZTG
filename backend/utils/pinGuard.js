"use strict";

/**
 * pinGuard.js — Reusable PIN verification middleware
 *
 * Reads the 4-digit PIN from the x-mfa-pin request header and validates it
 * against the user's bcrypt-hashed pinHash.
 *
 * Security:
 *  - Rejects if PIN not yet set up (user must complete /api/pin/setup first)
 *  - Enforces a 10-minute lockout after 5 consecutive failures
 *  - On success, resets the failure counter
 *
 * Usage (in any route that needs a PIN gate):
 *   router.delete("/:jti", verifyToken, verifyPinHeader, handler);
 */

const bcrypt      = require("bcrypt");
const User        = require("../models/User");
const ActivityLog = require("../models/ActivityLog");

async function verifyPinHeader(req, res, next) {
  try {
    const pin = req.headers["x-mfa-pin"];

    if (!pin) {
      return res.status(403).json({ pinRequired: true, message: "PIN required to perform this action." });
    }

    // Validate format before hitting bcrypt
    if (!/^\d{4}$/.test(pin)) {
      return res.status(403).json({ pinRequired: true, message: "PIN must be exactly 4 digits." });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    if (!user.pinEnabled || !user.pinHash) {
      return res.status(403).json({ message: "PIN not configured. Please complete PIN setup first." });
    }

    const now = new Date();
    if (user.pinLockUntil && user.pinLockUntil > now) {
      return res.status(403).json({
        message: "PIN locked due to too many failed attempts. Try again in 10 minutes."
      });
    }

    const isValid = await bcrypt.compare(pin, user.pinHash);

    if (!isValid) {
      user.pinFailedAttempts += 1;
      const isLocked = user.pinFailedAttempts >= 5;
      if (isLocked) {
        user.pinLockUntil = new Date(now.getTime() + 10 * 60 * 1000);
      }
      await user.save();

      // Log failed PIN attempt
      ActivityLog.create({
        userId:    req.user.id,
        action:    isLocked ? "PIN_LOCKOUT" : "PIN_VERIFY_FAILED",
        resource:  isLocked
          ? "PIN locked after 5 failed attempts"
          : `Failed PIN attempt ${user.pinFailedAttempts}/5`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        riskScore: isLocked ? 90 : 60,
        decision:  isLocked ? "BLOCK" : "REVIEW"
      }).catch(() => {});

      return res.status(403).json({
        pinRequired: true,
        message: isLocked
          ? "PIN locked due to too many failed attempts. Try again in 10 minutes."
          : "Incorrect PIN."
      });
    }

    // Valid PIN — reset counter and proceed
    user.pinFailedAttempts = 0;
    user.pinLockUntil      = null;
    await user.save();

    next();
  } catch (err) {
    console.error("pinGuard error:", err.message);
    res.status(500).json({ message: "PIN verification failed." });
  }
}

module.exports = verifyPinHeader;
