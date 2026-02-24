# Postman API Prompt – SmartBill Backend

Use this prompt in Postman (e.g. with Postman AI or when building a collection) so it understands all routes and payloads.

---

## Copy-paste prompt for Postman

```
SmartBill Backend API – Base URL: {{baseUrl}}/api/v1

**Authentication (for protected routes):**
- Send EITHER: Cookie `accessToken` OR Header `Authorization: Bearer <access_token>`
- Get tokens from: POST /api/v1/users/verify (phone + code) or POST /api/v1/users/refresh-token

**Routes and payloads:**

1) **Users – base path: /api/v1/users**

- **POST /send** (no auth)
  - Body (JSON): { "phone": "+919876543210" } or { "phone": "9876543210" } (backend may add +91)
  - Purpose: Send OTP to phone

- **POST /verify** (no auth)
  - Body (JSON): { "phone": "+919876543210", "code": "123456" }
  - Purpose: Verify OTP, create/login user, returns user + accessToken + refreshToken (and sets cookies)

- **PUT /update** (auth required)
  - Body (JSON): { "user_name": "string", "business_name": "string", "bill_expiry_days": number, "notification_lead_time": number } (all optional)
  - Purpose: Update current user profile

- **POST /refresh-token** (no auth)
  - Body (JSON): { "phone_number": "+919876543210", "refreshToken": "string" }
  - Purpose: Get new access token

- **POST /testing** (no auth)
  - No body required. Purpose: Health/test

2) **Invoices – base path: /api/v1/invoices** (all except list need auth)

- **POST /create** (auth + file)
  - Body: form-data, key `file` = invoice image/PDF file
  - Purpose: Upload invoice, get fileUrl + extractedData (Gemini)

- **POST /save** (auth)
  - Body (JSON): { "supplier_name": "string", "invoice_number": "string", "invoice_date": "YYYY-MM-DD or ISO date", "total_amount": number, "invoice_url": "string" }
  - All fields required. Purpose: Save invoice to DB (creates supplier if needed)

- **GET /** (auth)
  - No body. Purpose: Get all invoices for current user (sorted by date desc)

- **GET /supplier/:supplier_id** (auth)
  - URL param: supplier_id (Mongo ObjectId). Purpose: Get invoices for one supplier

- **GET /:invoice_id** (auth)
  - URL param: invoice_id (Mongo ObjectId). Purpose: Get one invoice + presigned fileUrl

3) **Payments – base path: /api/v1/payments** (auth required)

- **POST /** (auth + file)
  - Body: form-data → key `file` = proof image file; also send (form-data or JSON): supplier_id, amount (number), date (optional, ISO or YYYY-MM-DD), method (string), invoice_ids (array of invoice ObjectIds, or JSON string, or comma-separated string)
  - All of supplier_id, amount, method, invoice_ids required. Purpose: Record payment and mark invoices as paid

- **GET /** (auth)
  - No body. Purpose: Get all payments for current user

4) **Suppliers – base path: /api/v1/suppliers** (auth required)

- **GET /** (auth)
  - No body. Purpose: Get suppliers summary for current user (supplier_name, total_due, invoice_count per supplier)

**Standard response shape:** { "data": ..., "message": "string", "statusCode": number, "success": boolean }
**Errors:** 4xx/5xx with message (and optional errors array).
```

---

## Quick reference table

| Method | Path | Auth | Body / Params |
|--------|------|------|----------------|
| POST | /api/v1/users/send | No | `{ "phone": "+91..." }` |
| POST | /api/v1/users/verify | No | `{ "phone", "code" }` |
| PUT | /api/v1/users/update | Yes | `{ user_name?, business_name?, bill_expiry_days?, notification_lead_time? }` |
| POST | /api/v1/users/refresh-token | No | `{ "phone_number", "refreshToken" }` |
| POST | /api/v1/users/testing | No | — |
| POST | /api/v1/invoices/create | Yes | form-data: `file` (invoice image/PDF) |
| POST | /api/v1/invoices/save | Yes | `{ supplier_name, invoice_number, invoice_date, total_amount, invoice_url }` |
| GET | /api/v1/invoices | Yes | — |
| GET | /api/v1/invoices/supplier/:supplier_id | Yes | URL: supplier_id |
| GET | /api/v1/invoices/:invoice_id | Yes | URL: invoice_id |
| POST | /api/v1/payments | Yes | form-data: `file` + supplier_id, amount, method, invoice_ids, date? |
| GET | /api/v1/payments | Yes | — |
| GET | /api/v1/suppliers | Yes | — |

**Auth:** `Authorization: Bearer <access_token>` or cookie `accessToken`.
