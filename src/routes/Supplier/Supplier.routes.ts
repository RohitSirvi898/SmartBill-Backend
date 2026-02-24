import express from "express";
import { verifyJWT } from "../../middleware/Auth.middleware.js";
import { getSuppliersSummary } from "../../controllers/Supplier/Supplier.controller.js";

const router = express.Router();

router.get("/", verifyJWT, getSuppliersSummary);

export default router;
