const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const activityController = require("../controllers/activityController");

// Route: GET /api/activity-logs/my-logs
// Desc: Get the caller's own activity logs (any authenticated user)
router.get("/my-logs", authMiddleware, activityController.getMyLogs);

// Route: GET /api/activity-logs
// Desc: Get recent activity logs (Admin only)
router.get("/", authMiddleware, activityController.getLogs);

// Route: GET /api/activity-logs/uba
// Desc: User Behavior Analytics — Top riskiest users over last 7 days (Admin only)
router.get("/uba", authMiddleware, activityController.getUbaReport);

// Route: GET /api/activity-logs/export?format=csv|pdf
// Desc: Download full audit trail as CSV or PDF (Admin only)
router.get("/export", authMiddleware, activityController.exportLogs);

module.exports = router;
