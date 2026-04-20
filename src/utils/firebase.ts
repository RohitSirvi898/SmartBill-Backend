import admin from 'firebase-admin';
import serviceAccount from '../config/firebase-service-account.json' with { type: "json" }; // adjust path
import { ServiceAccount } from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as ServiceAccount)
});

export default admin;