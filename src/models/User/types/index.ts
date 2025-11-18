import { Document } from "mongoose";

export interface User extends Document {
    name: string;
    phone: string;
    refreshToken: string | null;
    refreshTokenExpires: Date | null;
    generateAccessToken(): string;
    generateAndSaveRefreshToken(): string;
}