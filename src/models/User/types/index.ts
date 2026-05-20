import { Document } from "mongoose";

export interface DeviceSession {
    deviceId: string;
    deviceName?: string;
    refreshToken: string;
    refreshTokenExpires: Date;
    createdAt: Date;
    lastUsedAt: Date;
}

export interface User extends Document {
    user_name: string;
    business_name: string;
    phone: string;
    bill_expiry_days:Number;
    notification_lead_time:Number;
    deviceSessions: DeviceSession[];
    fcmToken?: string;
    generateAccessToken(deviceId?: string): string;
    generateAndSaveRefreshTokenForDevice(deviceId: string, deviceName?: string): Promise<string>;
    removeDeviceSession(deviceId: string): Promise<void>;
    getActiveDeviceSessions(): DeviceSession[];
}