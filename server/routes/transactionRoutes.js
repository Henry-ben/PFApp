import express from "express";

import {
    createTransaction,
    getTransactions,
    getTransactionSummary,
    updateLoanStatus
} from "../controllers/transactionController.js";

const transRouter = express.Router();

transRouter.post("/", createTransaction);

transRouter.get("/", getTransactions);

transRouter.get("/summary", getTransactionSummary);

transRouter.patch("/:id/loan-status", updateLoanStatus);

export default transRouter;