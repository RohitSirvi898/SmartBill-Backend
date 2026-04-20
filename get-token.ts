import connectDB from './src/db/index.js';
import { UserModel } from './src/models/User/index.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const getToken = async () => {
    try {
        await connectDB();
        const user = await UserModel.findOne({ phone: '+919662203252' });
        if (user) {
            console.log("New Access Token:", user.generateAccessToken());
        } else {
            console.log("User not found!");
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

getToken();
