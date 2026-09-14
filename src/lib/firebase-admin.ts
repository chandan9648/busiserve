import {
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";

import {
  getAuth,
  type Auth,
} from "firebase-admin/auth";

import {
  getFirestore,
  type Firestore,
} from "firebase-admin/firestore";

let firebaseAdminApp: App | undefined;
let adminAuthInstance: Auth | undefined;
let adminDbInstance: Firestore | undefined;

function getFirebaseAdminApp(): App {
  if (firebaseAdminApp) {
    return firebaseAdminApp;
  }

  const existingApps = getApps();

  if (existingApps.length > 0) {
    firebaseAdminApp = existingApps[0];
    return firebaseAdminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();

  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ?.replace(/\\n/g, "\n")
    .trim();

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      [
        "Firebase Admin SDK configuration is missing.",
        "",
        "Required environment variables:",
        "FIREBASE_PROJECT_ID",
        "FIREBASE_CLIENT_EMAIL",
        "FIREBASE_PRIVATE_KEY",
        "",
        "Add these variables to .env.local for local development",
        "and to your production environment variables.",
      ].join("\n"),
    );
  }

  firebaseAdminApp = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  return firebaseAdminApp;
}

function getFirebaseAdminAuth(): Auth {
  if (!adminAuthInstance) {
    adminAuthInstance = getAuth(getFirebaseAdminApp());
  }

  return adminAuthInstance;
}

function getFirebaseAdminDb(): Firestore {
  if (!adminDbInstance) {
    adminDbInstance = getFirestore(getFirebaseAdminApp());
  }

  return adminDbInstance;
}

/*
 * Existing API routes use:
 *
 * import { adminAuth, adminDb } from "@/lib/firebase-admin";
 *
 * Keep these exports for backward compatibility.
 *
 * The actual Firebase Admin services are initialized lazily.
 */

export const adminAuth = new Proxy({} as Auth, {
  get(_target, property, receiver) {
    const auth = getFirebaseAdminAuth();

    const value = Reflect.get(
      auth as object,
      property,
      receiver,
    );

    if (typeof value === "function") {
      return value.bind(auth);
    }

    return value;
  },
});

export const adminDb = new Proxy({} as Firestore, {
  get(_target, property, receiver) {
    const db = getFirebaseAdminDb();

    const value = Reflect.get(
      db as object,
      property,
      receiver,
    );

    if (typeof value === "function") {
      return value.bind(db);
    }

    return value;
  },
});

/*
 * Getter exports for newer code.
 */

export function getAdminAuth(): Auth {
  return getFirebaseAdminAuth();
}

export function getAdminDb(): Firestore {
  return getFirebaseAdminDb();
}

export function getAdminApp(): App {
  return getFirebaseAdminApp();
}