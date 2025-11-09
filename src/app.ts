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
import otpRoutes from './routes/otp.routes.js';

// Test route
app.get('/test',(req,res)=>{
    res.send("API is working")
});

// API routes
app.use('/api/v1/otp', otpRoutes);

// Error handling middleware (must be last)
import { errorHandler } from './middleware/error.middleware.js';
app.use(errorHandler);

export default app;