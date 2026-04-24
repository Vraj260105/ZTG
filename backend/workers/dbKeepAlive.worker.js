/**
 * dbKeepAlive.worker.js
 *
 * Runs every 2 days at 03:00. Executes a lightweight SELECT 1 query against
 * the database to prevent Supabase from pausing the project due to inactivity.
 *
 * Why every 2 days?
 *   - Supabase pauses free-tier projects after 7 days of zero database activity.
 *   - A 2-day interval gives a comfortable 3x safety margin.
 *   - SELECT 1 has negligible cost — no reads, no writes, no table scans.
 *
 * Started once at server boot from server.js — no HTTP exposure.
 */

"use strict";

const cron            = require("node-cron");
const { sequelize }   = require("../config/database");

// Runs at 03:00 on every 2nd day of the month (1st, 3rd, 5th, ...)
// cron expression: minute hour day-of-month month day-of-week
cron.schedule("0 3 */2 * *", async () => {
  try {
    await sequelize.query("SELECT 1");
    console.log("[CRON] DB keep-alive ping sent successfully.");
  } catch (err) {
    console.error("[CRON] DB keep-alive ping failed:", err.message);
  }
});

console.log("[CRON] DB keep-alive worker started (pings every 2 days at 03:00 — prevents Supabase inactivity pause)");
