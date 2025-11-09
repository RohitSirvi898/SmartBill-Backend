import dotenv from 'dotenv';
dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID as string;
const authToken = process.env.TWILIO_AUTH_TOKEN as string;

if (!accountSid || !authToken) {
  throw new Error('Twilio credentials missing');
}

// ✅ Use dynamic import to ensure proper CJS loading under ESM
const twilio = (await import('twilio')).default;

const client = twilio(accountSid, authToken);
export default client;
