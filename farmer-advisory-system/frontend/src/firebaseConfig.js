// Firebase Configuration for Farmer Advisory System
// Initialize Firebase with Firestore

import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

// Replace with your Firebase project config
// You can get this from Firebase Console: Project Settings
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDemoKeyForTesting123456789",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "farmer-advisory.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "farmer-advisory-system",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "farmer-advisory-system.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:123456789:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Auth
const auth = getAuth(app);

// Use emulator in development (optional - comment out if not needed)
// const USE_EMULATOR = process.env.NODE_ENV === "development" && !window.location.hostname.includes("localhost");
// if (USE_EMULATOR) {
//   try {
//     connectFirestoreEmulator(db, "localhost", 8080);
//     connectAuthEmulator(auth, "http://localhost:9099");
//   } catch (error) {
//     // Emulator already connected
//   }
// }

export { db, auth, app };
