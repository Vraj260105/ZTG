const express    = require("express");
const router     = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { validate }   = require("../middleware/validate");
const {
  pinSetupSchema,
  pinVerifySchema,
  pinResetSchema
} = require("../middleware/schemas");

const pinController = require("../controllers/pinController");

// Status check — is PIN configured for this user?
router.get("/status", authMiddleware, pinController.getPinStatus);

// First-time PIN setup (called after TOTP enrollment on first login)
router.post("/setup",  authMiddleware, validate(pinSetupSchema),  pinController.setupPin);

// Verify PIN for an in-app action challenge
router.post("/verify", authMiddleware, validate(pinVerifySchema), pinController.verifyPin);

// PIN reset — requires current TOTP code + new PIN in the same request
router.post("/reset",  authMiddleware, validate(pinResetSchema),  pinController.resetPin);

module.exports = router;
