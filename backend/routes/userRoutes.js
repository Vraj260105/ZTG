const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const verifyPinHeader = require("../utils/pinGuard");
const userController = require("../controllers/userController");

// Route: DELETE /api/users/:id
// Desc: Delete a user (Admin only) — requires admin PIN
router.delete("/:id", authMiddleware, verifyPinHeader, userController.deleteUser);

module.exports = router;
