import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';
import { config } from '@core/config';

// Firebase instances
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let functions: Functions;
let googleProvider: GoogleAuthProvider;

/**
 * Initialize Firebase
 */
export function initializeFirebase() {
  // Initialize Firebase app
  if (!getApps().length) {
    app = initializeApp(config.firebase);
  } else {
    app = getApp();
  }

  // Initialize services
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app);

  // Initialize Google Auth Provider
  googleProvider = new GoogleAuthProvider();
  googleProvider.addScope('https://www.googleapis.com/auth/contacts.readonly');
  googleProvider.setCustomParameters({
    prompt: 'consent',
    include_granted_scopes: 'true',
  });

  return { app, auth, db, storage, functions, googleProvider };
}

// Export Firebase instances (initialized on first import)
const firebase = initializeFirebase();

export { firebase };
export const firebaseAuth = firebase.auth;
export const firebaseDb = firebase.db;
export const firebaseStorage = firebase.storage;
export const firebaseFunctions = firebase.functions;
export const firebaseGoogleProvider = firebase.googleProvider;
