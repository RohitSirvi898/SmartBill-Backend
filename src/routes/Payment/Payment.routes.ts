import { GetPaymentsData, SavePayment } from "../../controllers/Payment/Payment.controller.js";
import { verifyJWT } from "../../middleware/Auth.middleware.js";
import { upload } from "../../middleware/multer.middleware.js";
import { Router } from "express";

const router = Router();

router.post('/', verifyJWT, upload.single("file"), SavePayment);
router.get('/', verifyJWT, GetPaymentsData)

export default router;