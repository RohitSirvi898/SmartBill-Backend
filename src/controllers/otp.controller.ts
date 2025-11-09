import { Request, Response, NextFunction } from 'express';
import client from '../config/twilio.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
export const sendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {

        let phone = req.body?.phone;

        if (!phone) {
            throw new ApiError(400, 'Phone number is required');
        }
        if (!phone.startsWith('+')) {
          phone = '+91' + phone; // default country code (India)
        }
        
        if (!serviceSid) {
            throw new ApiError(500, 'Twilio Verify Service SID missing');
        }

        const verification = await client.verify.v2.services(serviceSid).verifications.create({
            to: phone,
            channel: 'sms'
        });

        res.status(200).json(new ApiResponse({ sid: verification.sid }, 'OTP sent successfully'));
    } catch (error) {
        next(error);
    }
};

export const verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { phone, code } = req.body;
        
        if (!phone || !code) {
            throw new ApiError(400, 'Phone and code required');
        }

        if (!serviceSid) {
            throw new ApiError(500, 'Twilio Verify Service SID missing');
        }

        const check = await client.verify.v2.services(serviceSid).verificationChecks.create({
            to: phone,
            code
        });

        if (!check.valid || check.status !== 'approved') {
            throw new ApiError(400, 'Invalid OTP');
        }

        res.status(200).json(new ApiResponse({ verified: true }, 'OTP verified successfully'));
    } catch (error) {
        next(error);
    }
};
