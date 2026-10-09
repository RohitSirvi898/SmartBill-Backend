import { upload } from "../../middleware/multer.middleware.js";
import { createInvoice, getOutstandingAndPaidAmount, getInvoice, getSupplierInvoice, saveInvoiceData, verifyInvoice } from "../../controllers/Invoice/Invoice.controller.js";
import { verifyJWT } from "../../middleware/Auth.middleware.js";
import express from "express";

const router = express.Router();

router.post('/create', verifyJWT, upload.single("file"), createInvoice);
router.post('/save', verifyJWT, saveInvoiceData);
router.put('/:id/verify', verifyJWT, verifyInvoice);
router.get('/:invoice_id', verifyJWT, getInvoice);
router.get('/supplier/:supplier_id', verifyJWT, getSupplierInvoice);
router.get('/', verifyJWT, getOutstandingAndPaidAmount);
// router.get('/list', verifyJWT, getInvoiceList);

export default router;
