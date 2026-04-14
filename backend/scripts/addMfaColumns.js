/**
 * One-time migration: adds `reason` and `adminMessage` columns to MfaChangeRequests table.
 * Run with: node backend/scripts/addMfaColumns.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { sequelize } = require("../config/database");

async function migrate() {
  const qi = sequelize.getQueryInterface();

  try {
    await qi.addColumn("MfaChangeRequests", "reason", {
      type: require("sequelize").DataTypes.STRING,
      allowNull: true,
    });
    console.log("✅ Added column: reason");
  } catch (e) {
    if (e.message.includes("already exists")) {
      console.log("⏩ Column 'reason' already exists — skipped.");
    } else {
      console.error("❌ Failed to add 'reason':", e.message);
    }
  }

  try {
    await qi.addColumn("MfaChangeRequests", "adminMessage", {
      type: require("sequelize").DataTypes.STRING,
      allowNull: true,
    });
    console.log("✅ Added column: adminMessage");
  } catch (e) {
    if (e.message.includes("already exists")) {
      console.log("⏩ Column 'adminMessage' already exists — skipped.");
    } else {
      console.error("❌ Failed to add 'adminMessage':", e.message);
    }
  }

  await sequelize.close();
  console.log("Migration complete.");
}

migrate();
