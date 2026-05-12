// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyAnApQ2XgoFraOsmuBCMo5xFQ7j3tFBTq0',
  authDomain: 'projeto-financas-d2516.firebaseapp.com',
  projectId: 'projeto-financas-d2516',
  storageBucket: 'projeto-financas-d2516.firebasestorage.app',
  messagingSenderId: '223977643841',
  appId: '1:223977643841:web:f462bf81bc23d6c8cc8bc0',
  measurementId: 'G-PPYZ0JD54H'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Analytics
const analytics = getAnalytics(app);

// Firestore
export const db = getFirestore(app);