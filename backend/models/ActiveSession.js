const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

/**
 * ActiveSession — persists each successfully authenticated JWT session.
 * Allows admins to enumerate live sessions and force-revoke them.
 * On logout or force-kick, the row is deleted and the jti is blacklisted.
 */
const ActiveSession = sequelize.define("ActiveSession", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  jti: {
    type: DataTypes.STRING(36),
    allowNull: false,
    unique: true,                // one row per token
  },

  role: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },

  ip: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },

  userAgent: {
    type: DataTypes.STRING(512),
    allowNull: true,
  },

  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,           // mirrors JWT exp — used to filter expired rows
  },
}, {
  tableName: "ActiveSessions",
  timestamps: true,             // createdAt = login time
  updatedAt: false,
});

module.exports = ActiveSession;
