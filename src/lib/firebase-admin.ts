import admin, { ServiceAccount } from 'firebase-admin';

/**
 * Initialize Firebase Admin SDK
 * This runs on the server-side only
 */
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccount: ServiceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  };
  if (!serviceAccount) {
    throw new Error(
      'Firebase Admin credentials are not properly configured. Check your environment variables.',
    );
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Initialize the app
const app = initializeFirebaseAdmin();

// Export initialized services
export const adminAuth = admin.auth(app);
export const adminDb = admin.firestore(app);
export const adminStorage = admin.storage(app);

export default app;
