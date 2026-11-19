import pool from "../config/db.js";

const allowedTypes = [
    "Food",
    "Loan",
    "Subscription",
    "Miscellaneous"
];

// Check whether month uses YYYY-MM format
function isValidMonth(month) {
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

// Check whether date is a real YYYY-MM-DD date
function isValidDate(date) {
    if (
        typeof date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
        return false;
    }

    const parsedDate = new Date(`${date}T00:00:00Z`);

    return (
        !Number.isNaN(parsedDate.getTime()) &&
        parsedDate.toISOString().slice(0, 10) === date
    );
}


// CREATE TRANSACTION
export async function createTransaction(req, res) {
    try {
        const {
            name,
            type,
            description,
            amount,
            direction,
            budgetGroup,
            date
        } = req.body;

        // Validate required fields
        if (!name || !type || !amount || !direction || !date) {
            return res.status(400).json({
                message: "Please provide all required transaction details"
            });
        }

        if (!allowedTypes.includes(type)) {
            return res.status(400).json({
                message: "Invalid transaction category"
            });
        }

        if (!["Income", "Expense"].includes(direction)) {
            return res.status(400).json({
                message: "Direction must be Income or Expense"
            });
        }

        if (
            direction === "Expense" &&
            !["Need", "Want"].includes(budgetGroup)
        ) {
            return res.status(400).json({
                message: "Expense must have a valid budget group: Need or Want"
            });
        }

        if (direction === "Income" && budgetGroup != null) {
            return res.status(400).json({
                message: "Income transactions cannot have a budget group"
            });
        }

        if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({
                message: "Amount must be greater than zero"
            });
        }

        if (!isValidDate(date)) {
            return res.status(400).json({
                message: "Please provide a valid transaction date"
            });
        }

        const loanStatus = type === "Loan" ? "Unpaid" : null;

        // Save transaction in PostgreSQL
        const result = await pool.query(
            `INSERT INTO transactions
            (name, type, description, amount, direction, budget_group, date, loan_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING
                id,
                name,
                type,
                description,
                amount,
                direction,
                budget_group AS "budgetGroup",
                date,
                created_at AS "createdAt",
                loan_status AS "loanStatus"`,
            [
                name.trim(),
                type,
                description?.trim() || "",
                Number(amount),
                direction,
                direction === "Expense" ? budgetGroup : null,
                date,
                loanStatus
            ]
        );


        const newTransaction = {
            ...result.rows[0],
            amount: Number(result.rows[0].amount)
        };

        return res.status(201).json({
            message: "Transaction created successfully",
            transaction: newTransaction
        });

    } catch (error) {
        return res.status(500).json({
            message: "Failed to create transaction"
        });
    }
}


// GET ALL TRANSACTIONS
export async function getTransactions(req, res) {
    try {
        const { month } = req.query;

        let query = `
            SELECT
                id,
                name,
                type,
                description,
                amount,
                direction,
                budget_group AS "budgetGroup",
                TO_CHAR(date, 'YYYY-MM-DD') AS date,
                created_at AS "createdAt",
                loan_status AS "loanStatus"
            FROM transactions
        `;

        let values = [];

        // Filter by month if one is provided
        if (month) {
            if (!isValidMonth(month)) {
                return res.status(400).json({
                    message: "Month must use YYYY-MM format"
                });
            }

            query += " WHERE date >= $1::date AND date < ($1::date + INTERVAL '1 month')";
            values.push(`${month}-01`);
        }

        query += " ORDER BY created_at DESC";

        const result = await pool.query(query, values);

        const transactions = result.rows.map(transaction => ({
            ...transaction,
            amount: Number(transaction.amount)
        }));


        return res.status(200).json({
            count: transactions.length,
            transactions
        });
        

    } catch (error) {

        console.error("Error retrieving transactions:", error.message);

        return res.status(500).json({
            message: "Failed to retrieve transactions"
        });
    }
}


// GET TRANSACTION SUMMARY
export async function getTransactionSummary(req, res) {
    try {
        const { month } = req.query;

        let query = `
            SELECT
                COALESCE(
                  SUM(amount) FILTER (WHERE direction = 'Income'), 0
                ) AS "total_income",
                COALESCE(
                  SUM(amount) FILTER (WHERE direction = 'Expense'), 0
                ) AS "total_expenses",

                COUNT(*) AS "transactionCount"
            FROM transactions
        `;

        let values = [];

        if (month) {
            if (!isValidMonth(month)) {
                return res.status(400).json({
                    message: "Month must use YYYY-MM format"
                });
            }

            query += " WHERE date >= $1::date AND date < ($1::date + INTERVAL '1 month')";
            
            values.push(`${month}-01`);
        }

        const result = await pool.query(query, values);

        const totalIncome = Number(result.rows[0].total_income);
        const totalExpenses = Number(result.rows[0].total_expenses);

        return res.status(200).json({
            totalIncome,
            totalExpenses,
            balance: totalIncome - totalExpenses,
            transactionCount: result.rows[0].transactionCount
        });

    } catch (error) {
        console.error("Error calculating transaction summary:", error.message);
        return res.status(500).json({
            message: "Failed to calculate transaction summary"
        });
    }
}


// UPDATE LOAN PAYMENT STATUS ONLY
export async function updateLoanStatus(req, res) {
    try {
        const { id } = req.params;
        const { loanStatus } = req.body;

        if (!["Paid", "Unpaid"].includes(loanStatus)) {
            return res.status(400).json({
                message: "Loan status must be Paid or Unpaid"
            });
        }

        // Only update records whose type is Loan
        const result = await pool.query(
            `UPDATE transactions
             SET loan_status = $1
             WHERE id = $2 AND type = 'Loan'
             RETURNING
                id,
                name,
                type,
                description,
                amount,
                direction,
                budget_group AS "budgetGroup",
                date,
                created_at AS "createdAt",
                loan_status AS "loanStatus"`,
            [loanStatus, id]
        );

        

        if (result.rows.length === 0) {
            const existing = await pool.query(
                `SELECT type FROM transactions WHERE id = $1`,
                [id]
            );
        

            if (existing.rows.length === 0) {
                return res.status(404).json({
                    message: "Transaction not found"
                });
            }

            return res.status(400).json({
                message: "Only Loan transactions can have their status changed"
            });
        }

        const transaction = {
            ...result.rows[0],
            amount: Number(result.rows[0].amount)
        };

        return res.status(200).json({
            message: "Loan status updated successfully",
            transaction
        });

    } catch (error) {
        console.error("Error updating loan status:", error.message);
        return res.status(500).json({
            message: "Failed to update loan status"
        });
    }
}