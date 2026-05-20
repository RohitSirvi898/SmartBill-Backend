import express from 'express';
import { sendOtp, verifyOtp, UpdateUser, refreshAccessToken, testing, updateFcmToken , logoutFromDevice, getActiveSessions, logoutFromAllDevices } from '../../controllers/User/User.controller.js';
import { verifyJWT } from '../../middleware/Auth.middleware.js';

const router = express.Router();

router.post('/send', sendOtp);
router.post('/verify', verifyOtp);
router.put('/update',verifyJWT,  UpdateUser);
router.post('/refresh-token', refreshAccessToken);
router.post('/update-fcm-token', verifyJWT, updateFcmToken);
router.post('/logout-device', verifyJWT, logoutFromDevice);
router.get('/active-sessions', verifyJWT, getActiveSessions);
router.post('/logout-all', verifyJWT, logoutFromAllDevices);
//testing route
router.post('/testing', testing)

export default router;
