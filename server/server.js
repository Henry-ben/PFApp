import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import transRouter from "./routes/transactionRoutes.js";
import potRouter from "./routes/potRoutes.js";
import budgetSettingsRouter from "./routes/budgetSettingsRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import pool from "./config/db.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/transactions", transRouter);
app.use("/api/pots", potRouter);
app.use("/api/budget-settings", budgetSettingsRouter);

app.get("/api/db-test", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW() AS current_time");

        res.status(200).json({
            message: "Database connection successful",
            current_time: result.rows[0].current_time
        });
    } catch (error) {
        console.error("Database connection error:", error.message);
        res.status(500).json({
            message: "Database connection failed"
        });
    }
});

app.get("/", (req, res) => {
    res.json({
        message: "PF App backend is working!"
    });
});
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT,"0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});