const { Sequelize } = require("sequelize");
require("dotenv").config();

// Prefer DATABASE_URL (Supabase / Render) → fall back to individual vars (local dev)
const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: "postgres",
      logging: false,
      dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false },
      },
    })
  : new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASS,
      {
        host: process.env.DB_HOST,
        dialect: "postgres",
        logging: false,
      }
    );

async function connectDB() {
  try {
    await sequelize.authenticate();
    console.log("PostgreSQL Connected Successfully");
  } catch (error) {
    console.error("Database connection error:", error);
  }
}

module.exports = { sequelize, connectDB };