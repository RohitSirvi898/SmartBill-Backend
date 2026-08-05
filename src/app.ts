import express from 'express';
import cors from 'cors';
// @ts-ignore: cookie-parser does not have local type declarations
import cookieParser from "cookie-parser";

const app = express();

// Enable CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

// Request parsing middleware
app.use(express.json({limit: "16kb"})) // Parse JSON bodies
app.use(express.urlencoded({extended: true, limit: "16kb"})) // Parse URL-encoded bodies
app.use(express.static("public")) // Serve static files
app.use(cookieParser()) // Parse cookies

// Import routes
import userRoutes from './routes/User/User.routes.js';
import invoiceRoutes from './routes/Invoice/Invoice.routes.js'
import paymentRoutes from './routes/Payment/Payment.routes.js'
import supplierRoutes from './routes/Supplier/Supplier.routes.js'
import { startBillingCronJobs } from './jobs/billing.cron.js';
if (process.env.ENABLE_BILLING_CRON === 'true') {
    startBillingCronJobs();
}

// API routes
app.post('/api/v1/health',(req, res) => {
    res.status(200).json({status: 'ok'});
});
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/suppliers', supplierRoutes);

// Error handling middleware (must be last)
import { errorHandler } from './middleware/error.middleware.js';
app.use(errorHandler);

export default app;
