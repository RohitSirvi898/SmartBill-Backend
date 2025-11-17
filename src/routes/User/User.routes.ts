import express from 'express';
import { sendOtp, verifyOtp, UpdateUser } from '../../controllers/User/User.controller.js';
import { verifyJWT } from '../../middleware/Auth.middleware.js';

const router = express.Router();

router.post('/send', sendOtp);
router.post('/verify', verifyOtp);
router.put('/update',verifyJWT,  UpdateUser);

export default router;
