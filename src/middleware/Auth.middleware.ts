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
    
        const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET as string) as {_id:string}
    
        const user = await UserModel.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,"Invalid Access Token")
        }
    
        req.user=user;
        next()
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error) || "Invalid access token";
        throw new ApiError(401, message);
    }

}