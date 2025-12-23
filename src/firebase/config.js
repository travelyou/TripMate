// Import the functions you need from the SDKs you need
import { getAnalytics } from 'firebase/analytics'
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyBtfX_CxDySqm0SJazMCNVH1G2jEcsiX2k',
  authDomain: 'travel-you-f4bca.firebaseapp.com',
  projectId: 'travel-you-f4bca',
  storageBucket: 'travel-you-f4bca.firebasestorage.app',
  messagingSenderId: '443119630004',
  appId: '1:443119630004:web:d0273eb20dde53c670c9e1',
  measurementId: 'G-EK2B3R34HD',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const analytics = getAnalytics(app)
export const auth = getAuth(app)
export const db = getFirestore(app)
