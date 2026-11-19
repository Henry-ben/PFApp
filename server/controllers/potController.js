
import pool from "../config/db.js";

// CREATE POT
export async function createPot(req, res) {
    try {
        const {
            name,
            description,
            target,
            priority,
            date,
            color
        } = req.body;

        if (!name?.trim() || target === undefined || target === null || target === "") {
            return res.status(400).json({
                message: "Pot name and target amount are required"
            });
        }

        if (!Number.isFinite(Number(target)) || Number(target) <= 0) {
            return res.status(400).json({
                message: "Target amount must be greater than zero"
            });
        }

        const result = await pool.query(
            `INSERT INTO pots
                (name, description, target_amount, priority, target_date, color)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING
                id,
                name,
                description,
                target_amount AS target,
                current_amount AS saved,
                priority,
                TO_CHAR(target_date, 'YYYY-MM-DD') AS date,
                color,
                created_at AS "createdAt"`,
            [
                name.trim(),
                description?.trim() || "",
                Number(target),
                priority || "Medium",
                date || null,
                color || "teal"
            ]
        );

        const pot = {
            ...result.rows[0],
            target: Number(result.rows[0].target),
            saved: Number(result.rows[0].saved),
            progress: 0
        };

        return res.status(201).json({
            message: "Pot created successfully",
            pot
        });

    } catch (error) {
        console.error("Create pot error:", error.message);

        return res.status(500).json({
            message: "Failed to create pot"
        });
    }
}


// GET ALL POTS
export async function getPots(req, res) {
    try {
        const result = await pool.query(
            `SELECT
                id,
                name,
                description,
                target_amount AS target,
                current_amount AS saved,
                priority,
                TO_CHAR(target_date, 'YYYY-MM-DD') AS date,
                color,
                created_at AS "createdAt"
             FROM pots
             ORDER BY created_at DESC`
        );

        const allPots = result.rows.map(pot => {
            const target = Number(pot.target);
            const saved = Number(pot.saved);

            return {
                ...pot,
                target,
                saved,
                progress: Math.min(
                    Math.round((saved / target) * 100),
                    100
                )
            };
        });

        return res.status(200).json({
            count: allPots.length,
            pots: allPots
        });

    } catch (error) {
        console.error("Get pots error:", error.message);

        return res.status(500).json({
            message: "Failed to retrieve pots"
        });
    }
}


// DEPOSIT INTO A POT
export async function depositIntoPot(req, res) {
    const client = await pool.connect();

    try {
        const { id } = req.params;
        const { amount, description } = req.body;

        if (
            amount === undefined ||
            amount === null ||
            amount === "" ||
            !Number.isFinite(Number(amount)) ||
            Number(amount) <= 0
        ) {
            return res.status(400).json({
                message: "Deposit amount must be greater than zero"
            });
        }

        const depositAmount = Number(amount);

        // Start database transaction
        await client.query("BEGIN");

        // Lock budget settings so simultaneous deposits
        // cannot bypass the monthly savings limit
        const settingsResult = await client.query(
            `SELECT formation
            FROM budget_settings
            WHERE id = 1
            FOR UPDATE`
        );

        if (settingsResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(500).json({
                message: "Budget settings not found"
            });
        }

        const formation = settingsResult.rows[0].formation;

        const savingsPercentage = formation === "5-3-2" ? 20 : 30;

        // Get the current month's income
        const incomeResult = await client.query(
            `SELECT COALESCE(SUM(amount), 0) AS total_income
            FROM transactions
            WHERE direction = 'Income'
            AND date >= DATE_TRUNC('month', CURRENT_DATE)::date
            AND date < (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::date`
        );

        const monthlyIncome = Number(incomeResult.rows[0].total_income);

        const savingsLimit = monthlyIncome * savingsPercentage / 100;

        // Calculate deposits already made into all pots this month
        const depositsResult = await client.query(
            `SELECT COALESCE(SUM(amount), 0) AS total_deposited
            FROM pot_deposits
            WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
            AND created_at < (
                DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
            )`
        );

        const totalDeposited = Number(depositsResult.rows[0].total_deposited);
        const remainingSavings = savingsLimit - totalDeposited;

        // Adjust deposit to the remaining monthly savings allowance
        const allowedDeposit = Math.min(
            depositAmount,
            Math.max(remainingSavings, 0)
        );

        if (allowedDeposit <= 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "Your monthly savings allowance has been exhausted."
            });
        }

        // Find and lock the pot
        const potResult = await client.query(
            `SELECT id, name, target_amount, current_amount
             FROM pots
             WHERE id = $1
             FOR UPDATE`,
            [id]
        );

        if (potResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "Pot not found"
            });
        }

        const existingPot = potResult.rows[0];

       const remainingAmount =
            Number(existingPot.target_amount) - Number(existingPot.current_amount);

        const finalDeposit = Math.min(
            allowedDeposit,
            remainingAmount
        );

        if (finalDeposit <= 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "This Pot has already reached its savings target."
            });
        }

        // Save the individual deposit
        const depositResult = await client.query(
            `INSERT INTO pot_deposits
             (pot_id, amount, description)
             VALUES ($1, $2, $3)
             RETURNING
                id,
                pot_id AS "potId",
                amount,
                description,
                created_at AS "createdAt"`,
            [
                id,
                finalDeposit,
                description?.trim() || "Pot deposit"
            ]
        );

        // Increase the pot's balance
       const updatedPotResult = await client.query(
            `UPDATE pots
            SET current_amount = current_amount + $1
            WHERE id = $2
            RETURNING
                id,
                name,
                description,
                target_amount AS target,
                current_amount AS saved,
                priority,
                TO_CHAR(target_date, 'YYYY-MM-DD') AS date,
                color,
                created_at AS "createdAt"`,
            [finalDeposit, id]
        );

        // Save both operations permanently
        await client.query("COMMIT");

        const updatedPot = updatedPotResult.rows[0];

        const pot = {
            ...updatedPot,
            target: Number(updatedPot.target),
            saved: Number(updatedPot.saved),
            progress: Math.min(
                Math.round(
                    (Number(updatedPot.saved) / Number(updatedPot.target)) * 100
                ),
                100
            )
        };

        const deposit = {
            ...depositResult.rows[0],
            amount: Number(depositResult.rows[0].amount)
        };

        return res.status(201).json({
            message: "Deposit successful",
            deposit,
            pot
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Deposit error:", error.message);

        return res.status(500).json({
            message: "Failed to deposit into pot"
        });

    } finally {
        client.release();
    }
}


// GET DEPOSIT HISTORY FOR A POT
export async function getPotDeposits(req, res) {
    try {
        const { id } = req.params;

        // Check whether the pot exists
        const potResult = await pool.query(
            "SELECT id FROM pots WHERE id = $1",
            [id]
        );

        if (potResult.rows.length === 0) {
            return res.status(404).json({
                message: "Pot not found"
            });
        }

        // Retrieve all deposits belonging to this pot
        const result = await pool.query(
            `SELECT
                id,
                pot_id AS "potId",
                amount,
                description,
                created_at AS "createdAt"
             FROM pot_deposits
             WHERE pot_id = $1
             ORDER BY created_at DESC`,
            [id]
        );

        const deposits = result.rows.map(deposit => ({
            ...deposit,
            amount: Number(deposit.amount)
        }));

        return res.status(200).json({
            count: deposits.length,
            deposits
        });

    } catch (error) {
        console.error("Get pot deposits error:", error.message);

        return res.status(500).json({
            message: "Failed to retrieve deposit history"
        });
    }
}


// DELETE POT AND ITS DEPOSIT HISTORY
export async function deletePot(req, res) {
    const client = await pool.connect();

    try {
        const { id } = req.params;

        await client.query("BEGIN");

        // Check whether the pot exists
        const potResult = await client.query(
            "SELECT id FROM pots WHERE id = $1 FOR UPDATE",
            [id]
        );

        if (potResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "Pot not found"
            });
        }

        // Delete all deposits belonging to this pot
        await client.query(
            "DELETE FROM pot_deposits WHERE pot_id = $1",
            [id]
        );

        // Delete the pot
        await client.query(
            "DELETE FROM pots WHERE id = $1",
            [id]
        );

        await client.query("COMMIT");

        return res.status(200).json({
            message: "Pot and its deposit history deleted successfully"
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Delete pot error:", error.message);

        return res.status(500).json({
            message: "Failed to delete pot"
        });

    } finally {
        client.release();
    }
}



// GET ALL POT DEPOSITS
export async function getAllPotDeposits(req, res) {
    try {
        const result = await pool.query(
            `SELECT
                id,
                pot_id AS "potId",
                amount,
                description,
                created_at AS "createdAt"
             FROM pot_deposits
             ORDER BY created_at DESC`
        );

        const deposits = result.rows.map((deposit) => ({
            ...deposit,
            amount: Number(deposit.amount)
        }));

        return res.status(200).json({
            count: deposits.length,
            deposits
        });

    } catch (error) {
        console.error("Get all pot deposits error:", error.message);

        return res.status(500).json({
            message: "Failed to retrieve all pot deposits"
        });
    }
}
