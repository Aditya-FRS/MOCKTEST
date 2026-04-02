/* ============================================
   Firebase Configuration

   SETUP INSTRUCTIONS:
   1. Go to https://console.firebase.google.com
   2. Create a new project (e.g., "mock-test-platform")
   3. Enable Authentication > Email/Password sign-in method
   4. Create Firestore Database (start in test mode)
   5. Go to Project Settings > General > Your apps > Add web app
   6. Copy the firebaseConfig values below
   ============================================ */

const firebaseConfig = {
    apiKey: "AIzaSyDC2Khvg545ScjEgc5P76kpsgkX26smAmA",
    authDomain: "mocktest-7d23a.firebaseapp.com",
    projectId: "mocktest-7d23a",
    storageBucket: "mocktest-7d23a.firebasestorage.app",
    messagingSenderId: "818688386166",
    appId: "1:818688386166:web:cc33683000ea00eb19eb57"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase services
const db = firebase.firestore();
const auth = firebase.auth();

// Check if Firebase is configured
function isFirebaseConfigured() {
    return firebaseConfig.apiKey && firebaseConfig.apiKey.length > 0;
}
