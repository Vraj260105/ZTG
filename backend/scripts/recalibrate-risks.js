/**
 * recalibrate-risks.js
 * ────────────────────────────────────────────────────────────────────────────
 * Finds users whose average ActivityLog risk score is above the TARGET_MAX
 * threshold and proportionally scales down ONLY their synthetic records
 * (actions from SYNTHETIC_ACTIONS) so the per-user average lands near TARGET.
 *
 * Safe: only touches records created by seed-alerts.js (identified by action name).
 * Real system logs (LOGIN, FILE_ACCESS etc.) are never modified.
 *
 * Run: node backend/scripts/recalibrate-risks.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const { sequelize } = require("../config/database");
const ActivityLog   = require("../models/ActivityLog");
const User          = require("../models/User");
const { Op, fn, col, literal } = require("sequelize");

// ── Config ────────────────────────────────────────────────────────────────────
const TARGET_AVG   = 58;  // desired per-user average risk score
const TARGET_MAX   = 65;  // only touch users whose average EXCEEDS this

// Only these action types were seeded synthetically — safe to adjust
const SYNTHETIC_ACTIONS = [
  "UNAUTHORIZED_ACCESS",
  "DATA_EXFILTRATION_ATTEMPT",
  "BRUTE_FORCE_DETECTED",
  "PRIVILEGE_ESCALATION",
  "SUSPICIOUS_LOGIN",
  "MASS_DOWNLOAD",
  "API_ABUSE",
  "ACCOUNT_LOCKOUT",
  "OFF_HOURS_ACCESS",
  "SENSITIVE_FILE_ACCESS",
  "CONFIG_TAMPERING",
  "ADMIN_OPERATION",
  "ACCOUNT_UNBLOCK",
  "DELETE_USER",
  "CREDENTIAL_STUFFING",
  "ANOMALOUS_BEHAVIOR",
];

// Minimum floor we'll ever reduce a score to
const SCORE_FLOOR = 55;

// ── Helpers ───────────────────────────────────────────────────────────────────
const clamp = (val, lo, hi) => Math.max(lo, Math.min(hi, val));

function scaleFactor(currentAvg, allLogs, syntheticLogs) {
  // We can only move synthetic scores — find what factor brings the avg down.
  // Formula:  newAvg = (sumReal + sumSynthetic * factor) / totalCount = TARGET_AVG
  const sumAll        = allLogs.reduce((s, l) => s + (l.riskScore || 0), 0);
  const countAll      = allLogs.length;
  const sumSynthetic  = syntheticLogs.reduce((s, l) => s + (l.riskScore || 0), 0);
  const sumReal       = sumAll - sumSynthetic;

  if (syntheticLogs.length === 0) return null; // nothing we can touch

  // Solve: (sumReal + sumSynthetic * f) / countAll = TARGET_AVG
  const neededSynSum = TARGET_AVG * countAll - sumReal;
  const factor       = neededSynSum / sumSynthetic;

  return Math.max(0.4, Math.min(1.0, factor)); // clamp factor 40%→100%
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  await sequelize.authenticate();
  console.log("✅  Connected to PostgreSQL\n");

  // 1. Fetch all activity logs with their userId
  const allLogs = await ActivityLog.findAll({
    attributes: ["id", "userId", "action", "riskScore"],
  });

  // 2. Group by user
  const byUser = {};
  for (const log of allLogs) {
    if (!byUser[log.userId]) byUser[log.userId] = { all: [], synthetic: [] };
    byUser[log.userId].all.push(log);
    if (SYNTHETIC_ACTIONS.includes(log.action)) {
      byUser[log.userId].synthetic.push(log);
    }
  }

  // 3. Fetch user details for display
  const users = await User.findAll({ attributes: ["id", "email", "role"] });
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  // 4. Find over-threshold users
  const overThreshold = Object.entries(byUser).filter(([uid, data]) => {
    const avg = data.all.reduce((s, l) => s + (l.riskScore || 0), 0) / data.all.length;
    return avg > TARGET_MAX;
  });

  if (overThreshold.length === 0) {
    console.log(`✅  All users are already at or below the ${TARGET_MAX} average threshold. Nothing to do.`);
    await sequelize.close();
    return;
  }

  console.log(`⚠️   Found ${overThreshold.length} users above avg ${TARGET_MAX} — recalibrating...\n`);
  console.log(
    "User".padEnd(36) + "Before".padEnd(10) + "After".padEnd(10) + "Adjusted"
  );
  console.log("─".repeat(70));

  let totalUpdated = 0;

  for (const [uid, data] of overThreshold) {
    const user       = userMap[uid];
    const email      = user?.email || `User #${uid}`;
    const beforeAvg  = data.all.reduce((s, l) => s + (l.riskScore || 0), 0) / data.all.length;
    const factor     = scaleFactor(beforeAvg, data.all, data.synthetic);

    if (!factor || data.synthetic.length === 0) {
      console.log(`${email.padEnd(36)}${beforeAvg.toFixed(1).padEnd(10)}${"no syn logs".padEnd(10)}0`);
      continue;
    }

    // Compute new scores and bulk-update
    const updates = data.synthetic.map(log => ({
      id:        log.id,
      riskScore: clamp(Math.round((log.riskScore || 0) * factor), SCORE_FLOOR, 100),
    }));

    // Apply updates one-by-one (Sequelize bulkUpdate needs individual saves for different values)
    for (const upd of updates) {
      await ActivityLog.update(
        { riskScore: upd.riskScore },
        { where: { id: upd.id } }
      );
    }
    totalUpdated += updates.length;

    // Compute expected new average
    const sumReal    = data.all
      .filter(l => !SYNTHETIC_ACTIONS.includes(l.action))
      .reduce((s, l) => s + (l.riskScore || 0), 0);
    const sumNewSyn  = updates.reduce((s, u) => s + u.riskScore, 0);
    const afterAvg   = (sumReal + sumNewSyn) / data.all.length;

    console.log(
      `${email.padEnd(36)}${beforeAvg.toFixed(1).padEnd(10)}${afterAvg.toFixed(1).padEnd(10)}${updates.length}`
    );
  }

  console.log("─".repeat(70));
  console.log(`\n✅  Done. Updated ${totalUpdated} synthetic records across ${overThreshold.length} users.`);
  console.log(`   Target average: ≤ ${TARGET_MAX}  →  ~${TARGET_AVG}`);

  await sequelize.close();
}

main().catch(err => {
  console.error("❌  Failed:", err.message || err);
  process.exit(1);
});
