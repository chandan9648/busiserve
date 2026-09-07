import { cert, getApps, getApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getPrivateKey() {
  const value = process.env.FIREBASE_PRIVATE_KEY;
  if (!value) throw new Error("Missing FIREBASE_PRIVATE_KEY");
  return value.replace(/\\n/g, "\n");
}

function getAdminApp() {
  return getApps()[0] ?? initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: getPrivateKey(),
      }),
    });
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}