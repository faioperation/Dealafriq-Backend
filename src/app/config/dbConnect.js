import dotenv from "dotenv";
import { Pool } from "pg";
import { envVars } from "./env";

dotenv.config();

const connectDB = async () => {
  try {
    const pool = new Pool({
      host: envVars.DB_HOST,
      user: envVars.DB_USER,
      password: envVars.DB_PASSWORD,
      database: envVars.DB_NAME,
      port: envVars.DB_PORT || 5432,
    });

    const client = await pool.connect();
    console.log("✅ PostgreSQL Connected Successfully!");
    client.release();

    return pool;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;
