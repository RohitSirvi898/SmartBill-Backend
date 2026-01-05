import { upload } from "../../middleware/multer.middleware.js";
import { createInvoice } from "../../controllers/Invoice/Invoice.controller.js";
import { verifyJWT } from "../../middleware/Auth.middleware.js";
import express from "express";

const router = express.Router();

router.post('/create', verifyJWT, upload.single("file"), createInvoice);
// router.get('/list', verifyJWT, getInvoiceList);

export default router;