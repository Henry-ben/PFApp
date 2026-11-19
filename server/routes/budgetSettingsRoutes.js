
import express from "express";

import {
    getBudgetSettings,
    updateBudgetSettings
} from "../controllers/budgetSettingsController.js";

const budgetSettingsRouter = express.Router();

budgetSettingsRouter.get("/", getBudgetSettings);
budgetSettingsRouter.put("/", updateBudgetSettings);

export default budgetSettingsRouter;
