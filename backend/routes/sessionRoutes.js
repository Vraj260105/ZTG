const express     = require("express");
const router      = express.Router();
const { Op }      = require("sequelize");
const verifyToken = require("../middleware/authMiddleware");
const speakeasy   = require("speakeasy");

const ActiveSession = require("../models/ActiveSession");
const User          = require("../models/User");
const blacklist     = require("../services/tokenBlacklist");

// ─── GET /api/sessions ─────────────────────────────────────────────────────
// Returns all non-expired sessions. Admin only.
router.get("/", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Access denied." });
    }

    const sessions = await ActiveSession.findAll({
      where: { expiresAt: { [Op.gt]: new Date() } },
      include: [{
        model: User,
        attributes: ["email", "name", "department", "role"],
      }],
      order: [["createdAt", "DESC"]],
    });

    res.json({ sessions });
  } catch (err) {
    console.error("List sessions error:", err);
    res.status(500).json({ message: "Failed to list sessions" });
  }
});

// ─── DELETE /api/sessions/:jti ─────────────────────────────────────────────
// Force-revoke a session by blacklisting its JWT and deleting the DB row.
// Requires admin TOTP if admin has MFA enabled (matching existing pattern).
router.delete("/:jti", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Access denied." });
    }

    const admin = await User.findByPk(req.user.id);

    // TOTP guard (matches pattern in socRoutes.js toggle-block)
    if (admin && admin.mfaEnabled) {
      const mfaToken = req.headers["x-mfa-pin"];
      if (!mfaToken) {
        return res.status(403).json({ mfaRequired: true, message: "Authenticator code required." });
      }
      const isValid = admin.mfaSecret && speakeasy.totp.verify({
        secret:   admin.mfaSecret,
        encoding: "base32",
        token:    mfaToken,
        window:   1,
      });
      if (!isValid) {
        return res.status(403).json({ mfaRequired: true, message: "Invalid or expired authenticator code." });
      }
    }

    const { jti } = req.params;

    // Prevent admin from kicking themselves
    if (jti === req.user.jti) {
      return res.status(400).json({ message: "You cannot revoke your own active session." });
    }

    const session = await ActiveSession.findOne({ where: { jti } });
    if (!session) {
      return res.status(404).json({ message: "Session not found or already expired." });
    }

    // Blacklist the jti — authMiddleware will reject it immediately
    blacklist.add(jti, Math.floor(session.expiresAt.getTime() / 1000));
    await session.destroy();

    res.json({ message: "Session revoked successfully." });
  } catch (err) {
    console.error("Revoke session error:", err);
    res.status(500).json({ message: "Failed to revoke session" });
  }
});

module.exports = router;
