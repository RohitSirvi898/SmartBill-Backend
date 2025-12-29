import { Request, Response, NextFunction } from 'express';
import client from '../../config/twilio.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { UserModel } from '../../models/User/index.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY ? parseInt(process.env.REFRESH_TOKEN_EXPIRY) : 7; 

// const generateAccessandRefreshToken = async(userid:string)=>{
//     try{
//         const user=await UserModel.findById(userid)
//         if(!user){
//             throw new ApiError(404,"User not found")
//         }
//         const accessToken=user.generateAccessToken();
//         const refreshToken = crypto.randomBytes(64).toString('hex');
//         const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
//         const refreshTokenExpires = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

//         user.refreshToken=refreshToken
//         await user.save({validateBeforeSave:false})

//         return {accessToken,refreshToken}
//     }catch(error){

//         throw new ApiError(500,error instanceof Error ? error.message : "Internal Server Error")
//     }
// }

export const UpdateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {name} = req.body;
        if(!name){
            throw new ApiError(400,"Name is required")
        }
        const user = await UserModel.findById(req.user._id);
        if(!user){
            throw new ApiError(404,"User not found")
        }
        user.user_name = name;
        await user.save();
        res.status(200).json(new ApiResponse({user}, "User name updated successfully"));
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

        let user = await UserModel.findOne({phone});

        if(!user){
            user = await UserModel.create({phone});
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = await user.generateAndSaveRefreshToken();

        const options = {
            httpOnly:true,
            secure: true,
        }
        
        res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refresh",refreshToken,options)
        .json(new ApiResponse({ user, newUser:user.user_name==null, accessToken,refreshToken }, 'OTP verified and User created successfully'));

    } catch (error) {
        next(error);
    }
};



export const refreshAccessToken = async (req: Request, res: Response, next: NextFunction) => {
    const { phone_number, refreshToken } = req.body;
    
    if (!phone_number || !refreshToken) {
        return next(new ApiError(401, "Phone number and refresh token are required."));
    }

    const user = await UserModel.findOne({
        phone: phone_number,
        refreshTokenExpires: { $gt: new Date() } 
    });

    if (!user) {
        return next(new ApiError(401, "Invalid user or expired refresh token."));
    }

    const validToken = await bcrypt.compare(refreshToken, user.refreshToken!);
    if (!validToken) {
        console.log("Invalid refresh token attempt for user:", user._id, user.refreshToken, refreshToken, validToken);
        return next(new ApiError(401, "Invalid refresh token."));
    }

    const newAccessToken = user.generateAccessToken();

    const expiryDays = parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS || "60");
    user.refreshTokenExpires = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
    await user.save();

    return res.status(200)
        .cookie("accessToken", newAccessToken, { httpOnly: true, secure: true })
        .json(new ApiResponse({
            accessToken: newAccessToken
            }, "Access token refreshed successfully"));
};

export const testing = async (req: Request, res: Response, next: NextFunction) => {
    // for testing any part of code
    try {
        res.status(200).json(new ApiResponse({}, "Testing endpoint working"));
    } catch (error) {
        next(error);
    }
}