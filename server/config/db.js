import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,

    ssl: {
        rejectUnauthorized: false
    }
});

// Check database connection
pool.on("connect", () => {
    console.log("Connected to PostgreSQL");
});

// Handle unexpected pool errors
pool.on("error", (error) => {
    console.error("Unexpected database error:", error.message);
});

export default pool;