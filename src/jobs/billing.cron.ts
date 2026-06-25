import cron from "node-cron";
import { InvoiceModel } from "../models/Invoice/index.js";
import { UserModel } from "../models/User/index.js";
import { sendDueBillNotification } from "../services/notification.service.js";

// This cron job runs every day at 8:00 AM
export const startBillingCronJobs = () => {
    cron.schedule('30 2 * * *', async () => {
        console.log('Running daily due-bill check...');

        try {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + 1);
            const startOfDay = new Date(targetDate);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(targetDate);
            endOfDay.setHours(23, 59, 59, 999);
            const dueInvoices = await InvoiceModel.find({
                status: 'unpaid',
                invoice_date: {
                    $gte: startOfDay,
                    $lte: endOfDay
                }
            }).populate('user_id supplier_id');

            console.log(`Found ${dueInvoices.length} invoices due today!`);

            if (dueInvoices.length === 0) {
                console.log('No invoices to process. Exiting.');
                return;
            }

            // Send notifications
            for (const invoice of dueInvoices) {
                // Assuming you populated the user to get their FCM token
                const user = invoice.user_id as any; 
                const supplier = invoice.supplier_id as any;
                
                // Only send if the user has a registered device token
                if (user.fcmToken) {
                    await sendDueBillNotification(
                        user.fcmToken, 
                        supplier.supplier_name, 
                        Number(invoice.total_amount)
                    );
                }
            }
        } catch (error) {
            console.error('❌ CRON ERROR:', error);
        }
    });
};