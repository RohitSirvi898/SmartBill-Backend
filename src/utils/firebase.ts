import admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';

const getServiceAccount = (): ServiceAccount => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing');
  }

  try {
    // 1. Parse the raw string into a JSON object
    const serviceAccount = JSON.parse(raw) as ServiceAccount;
    
    // 2. THE FIX: Convert literal '\n' strings back to actual newlines
    if (serviceAccount.privateKey) {
      serviceAccount.privateKey = serviceAccount.privateKey.replace(/\\n/g, '\n');
    }
    
    return serviceAccount;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT_JSON: ${errorMessage}`);
  }
};

export const getFirebaseAdmin = () => {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(getServiceAccount())
    });
  }
  return admin;
};

export default getFirebaseAdmin;