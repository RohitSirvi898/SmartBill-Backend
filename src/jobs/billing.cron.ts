import cron from "node-cron";
import { InvoiceModel } from "../models/Invoice/index.js";
import { UserModel } from "../models/User/index.js";
import { sendDueBillNotification } from "../services/notification.service.js";

// This cron job runs every day at 8:00 AM
export const startBillingCronJobs = () => {
    cron.schedule('0 8 * * *', async () => {
        console.log('Running daily due-bill check...');

        try {
            // 1. Calculate tomorrow's date range
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            
            const dayAfterTomorrow = new Date(tomorrow);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

            // 2. Find all UNPAID invoices due exactly tomorrow
            const dueInvoices = await InvoiceModel.find({
                status: 'unpaid',
                date: {
                    $gte: tomorrow,
                    $lt: dayAfterTomorrow
                }
            }).populate('user_id supplier_id'); 

            // 3. Send notifications
            for (const invoice of dueInvoices) {
                // Assuming you populated the user to get their FCM token
                const user = invoice.user_id as any; 
                const supplier = invoice.supplier_id as any;
                
                // Only send if the user has a registered device token
                if (user.fcmToken) {
                    await sendDueBillNotification(
                        user.fcmToken, 
                        supplier.name, 
                        Number(invoice.total_amount)
                    );
                }
            }
        } catch (error) {
            console.error('Error running billing cron job:', error);
        }
    });
};