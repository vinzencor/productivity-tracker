import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const defaultConfig = {
  apiKey: 'AIzaSyBzmz2KiLD7xHEZG2MSqv3W3ZHbDRBr8jc',
  authDomain: 'productivity-calculator-3ad0e.firebaseapp.com',
  projectId: 'productivity-calculator-3ad0e',
  storageBucket: 'productivity-calculator-3ad0e.firebasestorage.app',
  messagingSenderId: '278966142425',
  appId: '1:278966142425:web:cc5852d976a9268cbd05c8',
  measurementId: 'G-KCJ0BLPMTM',
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? defaultConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? defaultConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? defaultConfig.projectId,
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? defaultConfig.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? defaultConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? defaultConfig.appId,
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? defaultConfig.measurementId,
}

export const app = initializeApp(firebaseConfig)
// getAuth() in the browser already persists the session locally (IndexedDB), so it survives refreshes.
export const auth = getAuth(app)
export const db = getFirestore(app)
