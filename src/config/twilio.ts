import dotenv from 'dotenv';
import { createRequire } from 'module';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID as string;
const authToken = process.env.TWILIO_AUTH_TOKEN as string;

if (!accountSid || !authToken) {
  throw new Error('Twilio credentials missing');
}

// Use createRequire for CommonJS module compatibility in ESM
let client: any;
try {
  const require = createRequire(import.meta.url);
  const twilio = require('twilio');
  client = twilio(accountSid, authToken);
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('Failed to initialize Twilio client:', errorMessage);
  throw new Error(`Failed to initialize Twilio: ${errorMessage}`);
}

export default client;
