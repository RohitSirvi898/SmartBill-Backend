# 🚀 SmartBill-AI Backend API Server

> **SmartBill-AI Backend** is a production-ready, TypeScript-powered RESTful API server built on Express 5. It handles user authentication, AI-powered invoice OCR via Google Gemini, cloud storage with AWS S3, supplier ledger accounting, multi-invoice payment settlement, and automated due reminders via Firebase Cloud Messaging & Node-Cron.

---

## 🛠 Tech Stack

- **Runtime & Framework**: Node.js (>=20), Express.js (v5.1.0), TypeScript (v5.9)
- **Database & ORM**: MongoDB, Mongoose ORM (v8.19)
- **Artificial Intelligence**: Google Generative AI SDK (`@google/generative-ai` - `gemini-3.1-flash-lite`)
- **Cloud Storage**: AWS S3 SDK (`@aws-sdk/client-s3`) & presigned view URLs (`@aws-sdk/s3-request-presigner`)
- **Authentication & Security**: Twilio Verify API, JSON Web Tokens (`jsonwebtoken`), Bcrypt (`bcrypt`)
- **Push Notifications**: Firebase Admin SDK (`firebase-admin`)
- **Background Tasks**: Node-Cron (`node-cron`)
- **Testing & Tooling**: Jest (`jest`, `ts-jest`), Supertest, Nodemon, TSX

---

## ✨ Features

- 📱 **Twilio 2FA OTP Authentication**: Phone number authentication with SMS OTP verification.
- 🔐 **Multi-Device JWT Sessions**: Short-lived JWT access tokens and device-scoped, hashed refresh tokens with active session tracking & remote session revocation.
- 🤖 **AI Invoice Data Extraction**: Seamless buffer extraction of supplier name, invoice number, date, and total amount using Google Gemini AI vision capabilities.
- ☁️ **AWS S3 File Storage**: Secure document archiving with dynamic 15-minute presigned view URLs.
- 📊 **Supplier Ledger Accounting**: Automated vendor creation, balance increment on bill upload, decrement on payment settlement, and aggregate metrics.
- 💳 **Multi-Bill Payment Settlement**: Settle multiple unpaid invoices under a supplier in a single transaction with payment proof storage.
- 🔔 **Automated Bill Due Reminders**: Daily 8:00 AM background cron job scanning for upcoming dues and dispatching FCM push alerts.

---

## 📁 Directory Structure

```text
Backend/
├── .env.example              # Environment variables template
├── ecosystem.config.cjs      # PM2 production process manager config
├── jest.config.ts            # Jest unit & integration test configuration
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript compilation settings
└── src/
    ├── app.ts                # Express application setup, middlewares, and route registration
    ├── index.ts              # Server entry point & DB connection initialization
    ├── config/               # Twilio and service account credentials configs
    │   ├── twilio.ts
    │   └── firebase-service-account.json
    ├── controllers/          # Route handlers & business logic
    │   ├── Invoice/
    │   ├── Payment/
    │   ├── Supplier/
    │   └── User/
    ├── db/                   # MongoDB connection client
    ├── jobs/                 # Node-Cron background jobs (billing.cron.ts)
    ├── middleware/           # Auth JWT verification, Error handling, Multer file upload
    │   ├── Auth.middleware.ts
    │   ├── error.middleware.ts
    │   └── multer.middleware.ts
    ├── models/               # Mongoose schema definitions & TypeScript interfaces
    │   ├── Invoice/
    │   ├── Payment/
    │   ├── Supplier/
    │   └── User/
    ├── routes/               # Express API endpoints routing
    │   ├── Invoice/
    │   ├── Payment/
    │   ├── Supplier/
    │   └── User/
    ├── services/             # Firebase FCM notification delivery service
    │   └── notification.service.ts
    └── utils/                # Helper utilities (Gemini AI, AWS S3, API Response wrappers)
        ├── AWS_S3.ts
        ├── ApiError.ts
        ├── ApiResponse.ts
        ├── firebase.ts
        └── gemini.ts
```

---

## ⚙️ Environment Configuration

Create a `.env` file in the root `Backend/` directory by copying `.env.example`:

```bash
cp .env.example .env
```

Fill in the required configuration parameters:

```env
# Server Configuration
PORT=8000
MONGODB_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/smartbill
ACCESS_TOKEN_SECRET=your_jwt_access_token_secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY_DAYS=60
CORS_ORIGIN=*

# Twilio Verify 2FA
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_VERIFY_SERVICE_SID=your_twilio_verify_service_sid

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# AWS S3 Storage
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_S3_BUCKET_NAME=your_s3_bucket_name

# Firebase Admin SDK (Single-line JSON string)
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}

# Background Worker Flag (Set true only on persistent server instances)
ENABLE_BILLING_CRON=true
```

---

## 🚦 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run in Development Mode

Starts the development server with live reload powered by `nodemon` and `tsx`:

```bash
npm run dev
```

The server will start at `http://localhost:8000`.

### 3. Build for Production

Compiles TypeScript to JavaScript in `dist/`:

```bash
npm run build
```

### 4. Start Production Server

```bash
npm start
```

### 5. Run Unit & Integration Tests

```bash
npm test
```

---

## 📌 API Reference Endpoint Guide

### 👤 User & Auth Routes (`/api/v1/users`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/send` | Send 2FA SMS OTP to phone number | ❌ |
| `POST` | `/verify` | Verify OTP code & obtain access/refresh tokens | ❌ |
| `POST` | `/refresh-token` | Refresh JWT access token using device session token | ❌ |
| `GET` | `/` | Fetch current user profile details | ✅ |
| `PUT` | `/update` | Update user profile & business metadata | ✅ |
| `POST` | `/update-fcm-token` | Sync device Firebase Messaging token for push alerts | ✅ |
| `GET` | `/active-sessions` | List active device sessions logged into account | ✅ |
| `POST` | `/logout-device` | Revoke session for a specific device ID | ✅ |
| `POST` | `/logout-all` | Invalidate all logged-in device sessions | ✅ |

### 🧾 Invoice Routes (`/api/v1/invoices`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/create` | Upload invoice image $\rightarrow$ Upload to S3 + Extract data with Gemini AI | ✅ |
| `POST` | `/save` | Confirm & save invoice record, update supplier ledger balance | ✅ |
| `GET` | `/` | Fetch dashboard metrics (Total Outstanding & Monthly Paid Amounts) | ✅ |
| `GET` | `/supplier/:supplier_id` | Fetch all invoices linked to a specific supplier | ✅ |
| `GET` | `/:invoice_id` | Fetch single invoice details & presigned AWS S3 view URL | ✅ |

### 💳 Payment Routes (`/api/v1/payments`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/` | Settle invoices with proof image upload & update supplier due | ✅ |
| `GET` | `/` | Fetch payment history for authenticated user | ✅ |
| `GET` | `/:payment_id` | Fetch payment details, proof view URL & linked invoices | ✅ |

### 🏭 Supplier Routes (`/api/v1/suppliers`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Aggregated supplier directory (Total due, invoice counts, last bill date) | ✅ |

---

## 🚀 PM2 Production Deployment

For continuous background execution with PM2 process manager:

```bash
# Start with ecosystem config
npx pm2 start ecosystem.config.cjs --env production

# View logs
npx pm2 logs smartbill-server

# Monitor status
npx pm2 status
```

> **Note on Cron Jobs**: Set `ENABLE_BILLING_CRON=true` in `.env` only on a **single persistent instance** (e.g. EC2 master node) to prevent duplicated push notification triggers in scaled multi-instance deployments.

---

## 📄 License

This project is licensed under the **ISC License**. Author: **Rohit Sirvi**.
