// src/services/notification.service.ts
import getFirebaseAdmin from '../utils/firebase.js';

export const sendDueBillNotification = async (fcmToken: string, supplierName: string, amount: number) => {
    try {
        const message = {
            notification: {
                title: 'Bill Due Tomorrow! ⚠️',
                body: `Your payment of ₹${amount} to ${supplierName} is due tomorrow.`,
            },
            token: fcmToken,
        };

        const response = await getFirebaseAdmin().messaging().send(message);
        console.log('Successfully sent message:', response);
    } catch (error) {
        console.error('Error sending message:', error);
    }
};