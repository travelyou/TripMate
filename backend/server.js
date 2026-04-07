/* eslint-env node */
/* global require, process, module */
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const pool = require('./database/connection')
const discussionsRouter = require('./routes/discussions')
const commentsRouter = require('./routes/comments')
const likesRouter = require('./routes/likes')
const usersRouter = require('./routes/users')
const travelersRoutes = require('./routes/travelers')
const profileRouter = require('./routes/profile')
const itinerariesRouter = require('./routes/itineraries')
const paymentsRouter = require('./routes/payments')
const ordersRouter = require('./routes/orders')
const cartRouter = require('./routes/cart')
const swipesRouter = require('./routes/swipes')
const vendorsRouter = require('./routes/vendors')
const reviewsRouter = require('./routes/reviews')

const app = express()
const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || '0.0.0.0'

const allowedOrigins = [
  'https://tripmate-mayoyo.netlify.app',
  'https://tripmate-mayoyo.com',
  'https://www.tripmate-mayoyo.com',
  'https://tripmate-5vcj.onrender.com',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  process.env.ALLOWED_ORIGIN,
].filter(Boolean)

const corsOptions = {
  origin(origin, cb) {
    if (!origin) {
      return cb(null, true)
    }
    if (allowedOrigins.includes(origin)) {
      return cb(null, true)
    }
    return cb(null, true)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}

app.use(cors(corsOptions))

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin) {
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, X-Content-Range')
    }
  }
  if (req.method === 'OPTIONS') {
    return res.status(204).send()
  }
  next()
})

app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true, limit: '20mb' }))

app.get('/', (req, res) => {
  res.json({
    message: 'TripMate 後端 API 服務',
    environment: process.env.VERCEL ? 'Vercel Serverless' : 'Server/Local',
    endpoints: {
      test: '/api/test',
      testDb: '/api/test-db',
      discussions: '/api/discussions',
      posts: '/api/posts',
      comments: '/api/posts/:postId/comments',
      travelers: '/api/travelers',
      likes: '/api/likes',
    },
  })
})

app.get('/api/test', (req, res) => {
  res.json({ message: '後端 API 連接成功！' })
})

app.get('/api/test-cors', (req, res) => {
  res.json({
    message: 'CORS 測試成功！',
    origin: req.headers.origin || 'none',
    allowedOrigins: allowedOrigins,
  })
})

app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()')
    res.json({
      message: '資料庫連接成功！',
      timestamp: result.rows[0].now,
    })
  } catch (error) {
    res.status(500).json({
      error: '資料庫連接失敗',
      details: error?.message || String(error),
    })
  }
})

app.use('/api/discussions', discussionsRouter)
app.use('/api/posts', discussionsRouter)
app.use('/api', commentsRouter)
app.use('/api/likes', likesRouter)
app.use('/api/travelers', travelersRoutes)
app.use('/api/itineraries', itinerariesRouter)
app.use('/api/users', usersRouter)
app.use('/api/profile', profileRouter)
app.use('/api/payments', paymentsRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/cart', cartRouter)
app.use('/api/swipes', swipesRouter)
app.use('/api/collection', require('./routes/collection'))
app.use('/api/vendors', vendorsRouter)
app.use('/api/notifications', require('./routes/notifications'))
app.use('/api/my-itinerary', require('./routes/myItinerary'))
app.use('/api/ai/features', require('./routes/aiFeatures'))
app.use('/api/reviews', reviewsRouter)

app.use((err, req, res, next) => {
  const origin = req.headers.origin
  if (origin) {
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
    }
  }

  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      success: false,
      error: '請求體過大',
      message: '請求資料太大，請減少行程天數、打包清單項目或內容長度',
      limit: '1MB',
    })
  }

  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      error: 'CORS 錯誤',
      message: err.message,
    })
  }

  res.status(err.status || 500).json({
    error: err.message || '伺服器內部錯誤',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
})

app.use((req, res) => {
  const origin = req.headers.origin
  if (origin) {
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
    }
  }

  res.status(404).json({
    error: '找不到資源',
    path: req.path,
  })
})

if (!process.env.VERCEL) {
  const http = require('http')
  const { initWebSocket } = require('./websocket')

  const server = http.createServer(app)

  initWebSocket(server)

  server.listen(PORT, HOST, () => {
  })
}

module.exports = app

if (!process.env.VERCEL) {
  const { checkAndSendTravelerReminders } = require('./utils/travelerReminders')

  const scheduleReminderCheck = () => {
    const now = new Date()
    const nextCheck = new Date()
    nextCheck.setHours(1, 0, 0, 0)
    if (nextCheck <= now) {
      nextCheck.setDate(nextCheck.getDate() + 1)
    }

    const msUntilNext = nextCheck - now

    setTimeout(() => {
      checkAndSendTravelerReminders()
      setInterval(checkAndSendTravelerReminders, 24 * 60 * 60 * 1000)
    }, msUntilNext)
  }

  if (process.env.NODE_ENV === 'development') {
    setTimeout(() => {
      checkAndSendTravelerReminders()
    }, 5000)
  }

  scheduleReminderCheck()
}
