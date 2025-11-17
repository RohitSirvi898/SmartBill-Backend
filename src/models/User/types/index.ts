import { Document } from "mongoose";

export interface User extends Document {
    name: string;
    phone: string;
    refreshToken: string | null;
    generateAccessToken(): string;
    generateRefreshToken(): string;
}