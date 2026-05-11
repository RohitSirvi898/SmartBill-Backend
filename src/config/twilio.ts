import dotenv from 'dotenv';
import { createRequire } from 'module';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID as string;
const authToken = process.env.TWILIO_AUTH_TOKEN as string;

// Use createRequire for CommonJS module compatibility in ESM
let client: any | null = null;
if (accountSid && authToken) {
  try {
    const require = createRequire(import.meta.url);
    const twilio = require('twilio');
    client = twilio(accountSid, authToken);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to initialize Twilio client:', errorMessage);
  }
}

export default client;
