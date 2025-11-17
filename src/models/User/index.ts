import mongoose,{ Schema, Model} from "mongoose";
import {User} from "./types/index.js";
import jwt, { SignOptions } from 'jsonwebtoken';

const UserSchema: Schema<User> = new Schema<User>(
    {
        name:{type:String, default:null},
        phone:{type:String, required:true, unique:true},
        refreshToken:{type:String, default:null}
    },
    {timestamps:true}
)

UserSchema.methods.generateAccessToken=function(){
    return jwt.sign(
        {
            _id:this._id,
            phone:this.phone
        },
        process.env.ACCESS_TOKEN_SECRET as string,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        } as any
    )
}
UserSchema.methods.generateRefreshToken=function(){
    return jwt.sign(
        {
            _id:this._id
        },
        process.env.REFRESH_TOKEN_SECRET as string,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        } as any
    )
}

export const UserModel: Model<User> = mongoose.model<User>("User",UserSchema);