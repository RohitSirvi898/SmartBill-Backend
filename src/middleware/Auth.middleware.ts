// import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import jwt from "jsonwebtoken"
import {Response,Request,NextFunction} from "express"

export const verifyJWT = asyncHandler(async(req:Request,res:Response,next:NextFunction)=>{
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
    
        if(!token){
            throw new ApiError(401,"Unauthorization request")
        }
    
        const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
    
        // const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        // if(!user){
        //     throw new ApiError(401,"Invalid Access Token")
        // }
    
        // req.user=user;
        next()
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error) || "Invalid access token";
        throw new ApiError(401, message);
    }

})