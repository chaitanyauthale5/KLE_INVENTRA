import admin from 'firebase-admin';

let app;

export function initFirebaseAdmin() {
  if (app) return app;
  try {
    // Prefer JSON from env if provided
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    let credential;
    if (json) {
      const svc = JSON.parse(json);
      credential = admin.credential.cert(svc);
    } else {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      // Replace escaped newlines in private key
      const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
      if (projectId && clientEmail && privateKey) {
        credential = admin.credential.cert({ projectId, clientEmail, privateKey });
      }
    }
    if (!credential) {
      console.warn('[FirebaseAdmin] Missing credentials; push notifications disabled.');
      return null;
    }
    app = admin.initializeApp({ credential });
    return app;
  } catch (e) {
    console.error('[FirebaseAdmin] init error:', e);
    return null;
  }
}

export function getMessaging() {
  const a = initFirebaseAdmin();
  if (!a) return null;
  try {
    return admin.messaging();
  } catch (e) {
    console.error('[FirebaseAdmin] messaging error:', e);
    return null;
  }
}
