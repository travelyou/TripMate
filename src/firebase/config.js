// Import the functions you need from the SDKs you need
import { getAnalytics } from 'firebase/analytics'
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

if (import.meta.env.DEV) {
  const missingFields = Object.entries(firebaseConfig)
    .filter(([key, value]) => key !== 'measurementId' && (!value || value === 'undefined'))
    .map(([key]) => key)

  if (missingFields.length > 0) {
    console.warn('⚠️ Firebase 配置缺失：', missingFields.join(', '))
    console.warn('請檢查 .env 文件中的環境變數設置')
  } else {
    console.log('✅ Firebase 配置已載入')
    console.log('📋 Project ID:', firebaseConfig.projectId)
    // 只顯示 API Key 的前後部分，保護敏感信息
    if (firebaseConfig.apiKey) {
      const key = firebaseConfig.apiKey
      const maskedKey = key.length > 14
        ? key.substring(0, 10) + '...' + key.substring(key.length - 4)
        : key
      console.log('🔑 API Key:', maskedKey)
    }
  }
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
// eslint-disable-next-line no-unused-vars
const analytics = getAnalytics(app)
export const auth = getAuth(app)
export const db = getFirestore(app)
