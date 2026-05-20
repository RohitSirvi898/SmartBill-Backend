import {UserModel} from "../models/User/index.js"
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken"
import {Response,Request,NextFunction} from "express"

declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

export const verifyJWT = async(req:Request,res:Response,next:NextFunction)=>{
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
    
        if(!token){
            throw new ApiError(401,"Unauthorization request")
        }
    
        const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET as string) as {_id:string, deviceId?:string}
    
        const user = await UserModel.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,"Invalid Access Token")
        }

        // Update lastUsedAt for the device session if deviceId is present
        if(decodedToken.deviceId){
            const deviceSession = user.deviceSessions.find((session: any) => session.deviceId === decodedToken.deviceId);
            if(deviceSession){
                deviceSession.lastUsedAt = new Date();
                await user.save();
            }
        }
    
        req.user=user;
        next()
    } catch (error: unknown) {
    
        // Check if the error is specifically because the token expired
        if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ message: "Access token expired." });
        }
        
        // Handle other JWT errors (like a bad signature)
        if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ message: "Invalid access token." });
        }

        // Handle any other errors
        const message = error instanceof Error ? error.message : "Authentication failed";
        return res.status(401).json({ message });
    }

}

