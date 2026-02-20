import dotenv from "dotenv";
import { Pool } from "pg";
import { envVars } from "./env";

dotenv.config();

const connectDB = async () => {
  try {
    const pool = new Pool({
     url: envVars.DATABASE_URL,
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
