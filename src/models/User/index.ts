import mongoose,{ Schema, Model} from "mongoose";
import {User} from "./types/index.js";
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const UserSchema: Schema<User> = new Schema<User>(
    {
        user_name:{type:String, default:null},
        business_name:{type:String, default:null},
        phone:{type:String, required:true, unique:true},
        bill_expiry_days:{type:Number, default:30},
        notification_lead_time:{type:Number, default:5},
        refreshToken:{type:String, default:null},
        refreshTokenExpires:{type:Date, default:null}
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

UserSchema.methods.generateAndSaveRefreshToken = async function(): Promise<string> {
  const expiryDays = parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS || "60");
  
  const refreshToken = crypto.randomBytes(64).toString('hex');
  this.refreshToken = await bcrypt.hash(refreshToken, 10);
  this.refreshTokenExpires = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
  await this.save();

  return refreshToken;
};

export const UserModel: Model<User> = mongoose.model<User>("User",UserSchema);