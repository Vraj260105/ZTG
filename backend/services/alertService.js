/**
 * alertService.js
 * Centralised SOC Alert creation.
 * Matches the Alert model schema: { userId, riskScore, reason, status }
 */
const Alert = require("../models/Alert");

/**
 * @param {object} opts
 * @param {number}  opts.userId
 * @param {number}  [opts.riskScore]
 * @param {string}  opts.reason       - Human-readable description shown in SOC
 * @param {string}  [opts.status]     - "OPEN" (default) | "RESOLVED"
 */
async function createAlert({ userId, riskScore = 0, reason, status = "OPEN" }) {
  try {
    return await Alert.create({ userId, riskScore, reason, status });
  } catch (err) {
    // Alert creation must never crash a request
    console.error("[alertService] Failed to create alert:", err.message);
  }
}

module.exports = { createAlert };
