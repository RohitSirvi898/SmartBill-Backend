import { Request, Response, NextFunction } from 'express';
import client from '../../config/twilio.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { UserModel } from '../../models/User/index.js';
import bcrypt from 'bcrypt';

const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;


export const getUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try{
        const user = await UserModel.findById(req.user._id);
        if(!user){
            throw new ApiError(404,"User not found")
        }
        res.status(200).json(new ApiResponse({user}, "User Fetched Successfully"));
    }
    catch (error) {
        next(error);
    }
}


export const UpdateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {user_name, business_name, bill_expiry_days, notification_lead_time} = req.body;
        const user = await UserModel.findById(req.user._id);
        if(!user){
            throw new ApiError(404,"User not found")
        }
        user.user_name = user_name || user.user_name;
        user.business_name = business_name || user.business_name;
        user.bill_expiry_days = bill_expiry_days || user.bill_expiry_days;
        user.notification_lead_time = notification_lead_time || user.notification_lead_time;
        await user.save();
        res.status(200).json(new ApiResponse({user}, "User updated successfully"));
    }
    catch (error) {
        next(error);
    }
}

export const sendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {

        let phone = req.body?.phone;

        if (!phone) {
            throw new ApiError(400, 'Phone number is required');
        }
        if (!phone.startsWith('+')) {
          phone = '+91' + phone; // default country code (India)
        }
        
        if (!serviceSid || !client) {
            throw new ApiError(500, 'Twilio Verify is not configured');
        }

        await client.verify.v2.services(serviceSid).verifications.create({
            to: phone,
            channel: 'sms'
        });

        res.status(200).json(new ApiResponse('OTP sent successfully'));
    } catch (error) {
        next(error);
    }
};

export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { phone, code, deviceId, deviceName } = req.body;
        
        if (!phone || !code) {
            throw new ApiError(400, 'Phone and code required');
        }

        if (!deviceId) {
            throw new ApiError(400, 'Device ID is required');
        }

        if (!serviceSid || !client) {
            throw new ApiError(500, 'Twilio Verify is not configured');
        }

        const check = await client.verify.v2.services(serviceSid).verificationChecks.create({
            to: phone,
            code
        });

        if (!check.valid || check.status !== 'approved') {
            throw new ApiError(400, 'Invalid OTP');
        }

        let user = await UserModel.findOne({phone});

        if(!user){
            user = await UserModel.create({phone});
        }

        const accessToken = user.generateAccessToken(deviceId);
        const refreshToken = await user.generateAndSaveRefreshTokenForDevice(deviceId, deviceName);

        const options = {
            httpOnly:true,
            secure: true,
        }
        
        return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refresh",refreshToken,options)
        .json(new ApiResponse({ user, newUser:user.user_name==null, accessToken,refreshToken }, 'OTP verified and User created successfully'));

    } catch (error) {
        next(error);
    }
};



export const refreshAccessToken = async (req: Request, res: Response, next: NextFunction) => {
    const { phone_number, refreshToken, deviceId } = req.body;
    
    if (!phone_number || !refreshToken || !deviceId) {
        return next(new ApiError(401, "Phone number, refresh token, and device ID are required."));
    }

    try {
        const user = await UserModel.findOne({ phone: phone_number });

        if (!user) {
            return next(new ApiError(401, "User not found."));
        }

        // Find the device session
        const deviceSession = user.deviceSessions.find(
            (session: any) => session.deviceId === deviceId && session.refreshTokenExpires > new Date()
        );

        if (!deviceSession) {
            return next(new ApiError(401, "Invalid device or expired session."));
        }

        // Verify the refresh token
        const validToken = await bcrypt.compare(refreshToken, deviceSession.refreshToken);
        if (!validToken) {
            return next(new ApiError(401, "Invalid refresh token."));
        }

        // Update last used time
        deviceSession.lastUsedAt = new Date();
        await user.save();

        const newAccessToken = user.generateAccessToken();

        return res.status(200)
            .cookie("accessToken", newAccessToken, { httpOnly: true, secure: true })
            .json(new ApiResponse({
                accessToken: newAccessToken
            }, "Access token refreshed successfully"));
    } catch (error) {
        return next(error);
    }
};

export const updateFcmToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { fcmToken } = req.body;
        const user = await UserModel.findById(req.user._id);
        if(!user){
            throw new ApiError(404,"User not found")
        }
        user.fcmToken = fcmToken || user.fcmToken;
        await user.save();
        res.status(200).json(new ApiResponse({}, "FCM Token synced successfully"));
    } catch (error) {
        next(error);
    }
};

export const testing = async (req: Request, res: Response, next: NextFunction) => {
    // for testing any part of code
    try {
        res.status(200).json(new ApiResponse({}, "Testing endpoint working"));
    } catch (error) {
        next(error);
    }
}

export const logoutFromDevice = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { deviceId } = req.body;
        
        if (!deviceId) {
            throw new ApiError(400, 'Device ID is required');
        }

        const user = await UserModel.findById(req.user._id);
        if (!user) {
            throw new ApiError(404, 'User not found');
        }

        await user.removeDeviceSession(deviceId);
        
        res.status(200).json(new ApiResponse({}, 'Logged out from device successfully'));
    } catch (error) {
        next(error);
    }
};

export const getActiveSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await UserModel.findById(req.user._id);
        if (!user) {
            throw new ApiError(404, 'User not found');
        }

        const activeSessions = user.getActiveDeviceSessions().map((session: any) => ({
            deviceId: session.deviceId,
            deviceName: session.deviceName,
            createdAt: session.createdAt,
            lastUsedAt: session.lastUsedAt,
            expiresAt: session.refreshTokenExpires
        }));

        res.status(200).json(new ApiResponse({ sessions: activeSessions }, 'Active sessions retrieved successfully'));
    } catch (error) {
        next(error);
    }
};

export const logoutFromAllDevices = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await UserModel.findById(req.user._id);
        if (!user) {
            throw new ApiError(404, 'User not found');
        }

        user.deviceSessions = [];
        await user.save();

        res.status(200).json(new ApiResponse({}, 'Logged out from all devices successfully'));
    } catch (error) {
        next(error);
    }
};
