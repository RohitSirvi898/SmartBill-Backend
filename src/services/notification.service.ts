// src/services/notification.service.ts
import getFirebaseAdmin from '../utils/firebase.js';

export class NotificationService {
    async sendInvoiceReadyNotification(fcmToken: string, merchant: string) {
        try {
            const response = await getFirebaseAdmin().messaging().send({
                notification: {
                    title: 'Invoice ready for review',
                    body: `Your invoice from ${merchant} is ready for review.`,
                },
                token: fcmToken,
            });
            console.log('Successfully sent invoice-ready message:', response);
        } catch (error) {
            // A transient FCM problem should not re-run expensive OCR work.
            console.error('Error sending invoice-ready message:', error);
        }
    }
}

export const notificationService = new NotificationService();

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
