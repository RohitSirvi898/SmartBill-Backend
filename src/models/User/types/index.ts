import { Document } from "mongoose";

export interface User extends Document {
    user_name: string;
    business_name: string;
    phone: string;
    bill_expiry_days:Number;
    notification_lead_time:Number;
    refreshToken: string | null;
    refreshTokenExpires: Date | null;
    generateAccessToken(): string;
    generateAndSaveRefreshToken(): string;
}