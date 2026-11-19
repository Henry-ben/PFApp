import express from "express";

import {
    createPot,
    getPots,
    depositIntoPot,
    getPotDeposits,
    getAllPotDeposits,
    deletePot
} from "../controllers/potController.js";

const potRouter = express.Router();

potRouter.post("/", createPot);

potRouter.get("/", getPots);

potRouter.get("/deposits", getAllPotDeposits);

potRouter.post("/:id/deposits", depositIntoPot);

potRouter.get("/:id/deposits", getPotDeposits);

potRouter.delete("/:id", deletePot);

export default potRouter;