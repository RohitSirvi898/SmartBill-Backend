import { Request, Response, NextFunction } from 'express';
import client from '../../config/twilio.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { UserModel } from '../../models/User/index.js';

const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

const generateAccessandRefreshToken = async(userid:string)=>{
    try{
        const user=await UserModel.findById(userid)
        if(!user){
            throw new ApiError(404,"User not found")
        }
        const accessToken=user.generateAccessToken();
        const refreshToken=user.generateRefreshToken();
        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})

        return {accessToken,refreshToken}
    }catch(error){

        throw new ApiError(500,error instanceof Error ? error.message : "Internal Server Error")
    }
}

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
        user.name = name;
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

        console.log("approved")

        let user = await UserModel.findOne({phone});
        let isNewUser=false;


        if(!user){
            isNewUser=true;
            user = await UserModel.create({phone});
        }
        const {accessToken,refreshToken}= await generateAccessandRefreshToken(user?._id as string);

        const options = {
            httpOnly:true,
            secure: true,
        }

        
        if(isNewUser){
            res.status(200)
            .cookie("accessToken",accessToken,options)
            .cookie("refresh",refreshToken,options)
            .json(new ApiResponse({ user, newUser:true, accessToken,refreshToken }, 'OTP verified and User created successfully'));
        }
        else{
            res.status(200)
            .cookie("accessToken",accessToken,options)
            .cookie("refresh",refreshToken,options)
            .json(new ApiResponse({ user, newUser:false, accessToken, refreshToken }, 'OTP verified successfully'));
        }
    } catch (error) {
        next(error);
    }
};
