const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Alert = sequelize.define("Alert", {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  riskScore: {
    type: DataTypes.INTEGER
  },
  reason: {
    type: DataTypes.STRING
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: "OPEN"
  }
});

// ── Real-time socket hooks ───────────────────────────────────────────────────
Alert.addHook("afterCreate", (alert) => {
  try {
    const io = require("../utils/socket").getIo();
    if (io) io.to("soc").emit("new_alert", alert.toJSON());
  } catch (_) {}
});

Alert.addHook("afterUpdate", (alert) => {
  try {
    const io = require("../utils/socket").getIo();
    if (io) io.to("soc").emit("update_alert", alert.toJSON());
  } catch (_) {}
});

module.exports = Alert;