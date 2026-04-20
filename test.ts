import connectDB from './src/db/index.js';
import { UserModel } from './src/models/User/index.js';
import { sendDueBillNotification } from './src/services/notification.service.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const runTest = async () => {
    try {
        await connectDB();
        const user = await UserModel.findOne({ fcmToken: { $exists: true, $nin: [null, ""] } });
        if (!user || !user.fcmToken) {
            console.log("No user with a valid FCM token found in the database. Cannot send test notification.");
            process.exit(0);
        }
        
        console.log(`Found user ${user.user_name} with FCM token. Sending test notification...`);
        await sendDueBillNotification(user.fcmToken, "Test Supplier (AI Test)", 1500);
        console.log("Notification test completed.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

runTest();
