"use strict";

/**
 * pinController.js — 4-digit PIN lifecycle
 *
 * The PIN is the in-app second factor used for all post-login sensitive actions.
 * TOTP (Google Authenticator) is used ONLY at login and for verifying PIN resets.
 *
 * Endpoints:
 *   GET  /api/pin/status  → returns { pinEnabled: bool }
 *   POST /api/pin/setup   → first-time PIN creation
 *   POST /api/pin/verify  → validate PIN for an in-app action
 *   POST /api/pin/reset   → TOTP-verified PIN reset
 */

const bcrypt      = require("bcrypt");
const speakeasy   = require("speakeasy");
const User        = require("../models/User");
const ActivityLog = require("../models/ActivityLog");

const BCRYPT_ROUNDS = 12;

// ── GET /api/pin/status ───────────────────────────────────────────────────────
exports.getPinStatus = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "pinEnabled"]
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ pinEnabled: user.pinEnabled });
  } catch (err) {
    console.error("getPinStatus error:", err.message);
    res.status(500).json({ message: "Failed to get PIN status" });
  }
};

// ── POST /api/pin/setup ───────────────────────────────────────────────────────
// First-time PIN setup. Validated by Zod schema (pinSetupSchema) before reaching here.
exports.setupPin = async (req, res) => {
  try {
    const { pin } = req.validated;   // already validated as /^\d{4}$/ by Zod

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.pinHash           = await bcrypt.hash(pin, BCRYPT_ROUNDS);
    user.pinEnabled        = true;
    user.pinFailedAttempts = 0;
    user.pinLockUntil      = null;
    await user.save();

    ActivityLog.create({
      userId:    user.id,
      action:    "PIN_SETUP",
      resource:  "4-digit PIN configured successfully",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      riskScore: 5,
      decision:  "ALLOW"
    }).catch(() => {});

    res.status(200).json({ message: "PIN set successfully. Your account is now fully protected." });
  } catch (err) {
    console.error("setupPin error:", err.message);
    res.status(500).json({ message: "Failed to set PIN" });
  }
};

// ── POST /api/pin/verify ──────────────────────────────────────────────────────
// Validate PIN for an in-app action challenge (returns { verified: true } on success).
// The actual protected action is still guarded by pinGuard middleware on the action route;
// this endpoint is used by the frontend to verify PIN before showing the result.
exports.verifyPin = async (req, res) => {
  try {
    const { pin } = req.validated;

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.pinEnabled || !user.pinHash) {
      return res.status(403).json({ message: "PIN not configured. Please complete PIN setup." });
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

      ActivityLog.create({
        userId:    user.id,
        action:    isLocked ? "PIN_LOCKOUT" : "PIN_VERIFY_FAILED",
        resource:  isLocked
          ? "PIN locked after 5 failed attempts"
          : `Failed PIN attempt ${user.pinFailedAttempts}/5`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        riskScore: isLocked ? 90 : 60,
        decision:  isLocked ? "BLOCK" : "REVIEW"
      }).catch(() => {});

      return res.status(401).json({
        message: isLocked
          ? "PIN locked due to too many failed attempts. Try again in 10 minutes."
          : "Incorrect PIN."
      });
    }

    // Success — reset counter
    user.pinFailedAttempts = 0;
    user.pinLockUntil      = null;
    await user.save();

    res.status(200).json({ verified: true });
  } catch (err) {
    console.error("verifyPin error:", err.message);
    res.status(500).json({ message: "Failed to verify PIN" });
  }
};

// ── POST /api/pin/reset ───────────────────────────────────────────────────────
// TOTP-verified PIN reset. User must supply a valid 6-digit TOTP code AND the new 4-digit PIN.
exports.resetPin = async (req, res) => {
  try {
    const { totpToken, newPin } = req.validated;

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.mfaSecret || !user.mfaEnabled) {
      return res.status(400).json({ message: "TOTP not configured. Cannot reset PIN without authenticator." });
    }

    // Verify the TOTP code first — this is the identity gate
    const now = new Date();
    if (user.mfaLockUntil && user.mfaLockUntil > now) {
      return res.status(403).json({ message: "Authenticator locked. Try again later." });
    }

    const totpValid = speakeasy.totp.verify({
      secret:   user.mfaSecret,
      encoding: "base32",
      token:    totpToken,
      window:   1
    });

    if (!totpValid) {
      user.mfaFailedAttempts += 1;
      if (user.mfaFailedAttempts >= 5) {
        user.mfaLockUntil = new Date(now.getTime() + 5 * 60 * 1000);
      }
      await user.save();

      ActivityLog.create({
        userId:    user.id,
        action:    "PIN_RESET_TOTP_FAILED",
        resource:  "Failed TOTP verification during PIN reset",
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        riskScore: 70,
        decision:  "REVIEW"
      }).catch(() => {});

      return res.status(401).json({ message: "Invalid or expired authenticator code." });
    }

    // TOTP valid — reset the PIN
    user.mfaFailedAttempts = 0;
    user.mfaLockUntil      = null;
    user.pinHash           = await bcrypt.hash(newPin, BCRYPT_ROUNDS);
    user.pinEnabled        = true;
    user.pinFailedAttempts = 0;
    user.pinLockUntil      = null;
    await user.save();

    ActivityLog.create({
      userId:    user.id,
      action:    "PIN_RESET",
      resource:  "PIN reset successfully via TOTP verification",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      riskScore: 20,
      decision:  "ALLOW"
    }).catch(() => {});

    res.status(200).json({ message: "PIN reset successfully." });
  } catch (err) {
    console.error("resetPin error:", err.message);
    res.status(500).json({ message: "Failed to reset PIN" });
  }
};
