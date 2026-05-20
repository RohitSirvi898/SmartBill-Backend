import mongoose,{ Schema, Model} from "mongoose";
import {User, DeviceSession} from "./types/index.js";
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const DeviceSessionSchema = new Schema<DeviceSession>({
    deviceId: { type: String, required: true },
    deviceName: { type: String, default: null },
    refreshToken: { type: String, required: true },
    refreshTokenExpires: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    lastUsedAt: { type: Date, default: Date.now }
});

const UserSchema: Schema<User> = new Schema<User>(
    {
        user_name:{type:String, default:null},
        business_name:{type:String, default:null},
        phone:{type:String, required:true, unique:true},
        bill_expiry_days:{type:Number, default:30},
        notification_lead_time:{type:Number, default:5},
        deviceSessions: [DeviceSessionSchema]
    },
    {timestamps:true}
)

UserSchema.methods.generateAccessToken=function(deviceId?: string){
    return jwt.sign(
        {
            _id:this._id,
            phone:this.phone,
            deviceId: deviceId || null
        },
        process.env.ACCESS_TOKEN_SECRET as string,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        } as any
    )
}

UserSchema.methods.generateAndSaveRefreshTokenForDevice = async function(deviceId: string, deviceName?: string): Promise<string> {
  const expiryDays = parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS || "60");
  
  const refreshToken = crypto.randomBytes(64).toString('hex');
  const hashedToken = await bcrypt.hash(refreshToken, 10);

  // Remove old session for this device if exists
  this.deviceSessions = this.deviceSessions.filter((session: DeviceSession) => session.deviceId !== deviceId);

  // Add new session
  this.deviceSessions.push({
    deviceId,
    deviceName: deviceName || `Device ${this.deviceSessions.length + 1}`,
    refreshToken: hashedToken,
    refreshTokenExpires: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    lastUsedAt: new Date()
  });

  // Clean up expired sessions
  this.deviceSessions = this.deviceSessions.filter((session: DeviceSession) => session.refreshTokenExpires > new Date());

  await this.save();
  return refreshToken;
};

UserSchema.methods.removeDeviceSession = async function(deviceId: string): Promise<void> {
  this.deviceSessions = this.deviceSessions.filter((session: DeviceSession) => session.deviceId !== deviceId);
  await this.save();
};

UserSchema.methods.getActiveDeviceSessions = function(): DeviceSession[] {
  const now = new Date();
  return this.deviceSessions.filter((session: DeviceSession) => session.refreshTokenExpires > now);
};

export const UserModel: Model<User> = mongoose.model<User>("User",UserSchema);