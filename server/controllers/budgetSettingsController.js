
import pool from "../config/db.js";

// GET SAVED BUDGET FORMATION
export async function getBudgetSettings(req, res) {
    try {
        const result = await pool.query(
            `SELECT formation
             FROM budget_settings
             WHERE id = 1`
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Budget settings not found"
            });
        }

        return res.status(200).json({
            formation: result.rows[0].formation
        });

    } catch (error) {
        console.error("Get budget settings error:", error.message);

        return res.status(500).json({
            message: "Failed to retrieve budget settings"
        });
    }
}


// UPDATE BUDGET FORMATION
export async function updateBudgetSettings(req, res) {
    try {
        const { formation } = req.body;

        if (!["5-3-2", "4-3-3"].includes(formation)) {
            return res.status(400).json({
                message: "Invalid budget formation"
            });
        }

        const result = await pool.query(
            `UPDATE budget_settings
             SET formation = $1,
                 updated_at = NOW()
             WHERE id = 1
             RETURNING formation, updated_at AS "updatedAt"`,
            [formation]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Budget settings not found"
            });
        }

        return res.status(200).json({
            message: "Budget formation updated successfully",
            settings: result.rows[0]
        });

    } catch (error) {
        console.error("Update budget settings error:", error.message);

        return res.status(500).json({
            message: "Failed to update budget settings"
        });
    }
}
