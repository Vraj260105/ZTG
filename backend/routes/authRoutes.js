const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const verifyToken = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validate");
const { registerSchema, loginSchema } = require("../middleware/schemas");

const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs:       15 * 60 * 1000,
  max:            10,
  standardHeaders: true,
  legacyHeaders:  false,
  message:        { message: "Too many login/registration attempts. Please wait 15 minutes before trying again." },
});

router.post("/register", authLimiter, validate(registerSchema), authController.register);
router.post("/login",    authLimiter, validate(loginSchema),    authController.login);

// Profile
router.get("/profile", verifyToken, authController.getProfile);

// [H2] Logout — adds token jti to blacklist for immediate revocation
router.post("/logout", verifyToken, authController.logout);

module.exports = router;