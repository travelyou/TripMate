/* eslint-env node */
/* global require, process */
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const pool = require('./database/connection')
const discussionsRouter = require('./routes/discussions')
const commentsRouter = require('./routes/comments')
const likesRouter = require('./routes/likes')
const usersRouter = require('./routes/users')
const travelersRoutes = require('./routes/travelers')
const itinerariesRouter = require('./routes/itineraries')
const paymentsRouter = require('./routes/payments')
const ordersRouter = require('./routes/orders')
const cartRouter = require('./routes/cart')

const app = express()
const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || '0.0.0.0'

const allowedOrigins = [
  'https://tripmate.zeabur.app',
  'https://tripmate-backend.zeabur.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

// CORS 配置函數
function setCorsHeaders(req, res) {
  const origin = req.headers.origin
  if (!origin || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, X-Content-Range')
  }
}

// 手動處理 OPTIONS 預檢請求（使用中間件而非路由）
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin
    if (!origin || allowedOrigins.includes(origin)) {
      setCorsHeaders(req, res)
      return res.status(204).send()
    } else {
      return res.status(403).send()
    }
  }
  next()
})

// CORS 配置（用於非 OPTIONS 請求）
const corsOptions = {
  origin(origin, cb) {
    // 允許沒有 origin 的請求（例如：Postman、curl、伺服器端請求）
    if (!origin) {
      console.log('CORS: 允許無 origin 的請求')
      return cb(null, true)
    }
    // 檢查是否在允許列表中
    if (allowedOrigins.includes(origin)) {
      console.log(`CORS: 允許來源 ${origin}`)
      return cb(null, true)
    }
    // 記錄被阻擋的來源（用於除錯）
    console.log(`CORS: 阻擋來源 ${origin}`)
    // 拒絕其他來源
    return cb(new Error(`CORS blocked origin: ${origin}`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}

// 使用 CORS 中間件處理所有非 OPTIONS 請求
app.use(cors(corsOptions))

// 記錄所有請求（用於除錯）
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`)
  next()
})

app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true, limit: '20mb' }))

// 根路徑處理
app.get('/', (req, res) => {
  res.json({
    message: 'TripMate 後端 API 服務',
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

// CORS 測試端點
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

// 使用路由
app.use('/api/discussions', discussionsRouter)
app.use('/api/posts', discussionsRouter)
app.use('/api', commentsRouter)
app.use('/api/likes', likesRouter)
app.use('/api/travelers', travelersRoutes)
app.use('/api/itineraries', itinerariesRouter)
app.use('/api/users', usersRouter)

// 付款路由
app.use('/api/payments', paymentsRouter)

// 訂單路由
app.use('/api/orders', ordersRouter)

// 購物車路由
app.use('/api/cart', cartRouter)
app.use('/discussions', discussionsRouter)
app.use('/api/vendors', require('./routes/vendors'))

// 全域錯誤處理中間件
// 處理請求體過大的錯誤
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // 確保 CORS 標頭在錯誤回應中也被設置
  const origin = req.headers.origin
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }

  // 處理請求體過大的錯誤
  if (err.type === 'entity.too.large' || err.status === 413) {
    console.error('❌ 請求體過大:', err.message)
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

  console.error('錯誤:', err.message)
  res.status(err.status || 500).json({
    error: err.message || '伺服器內部錯誤',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
})

// 404 處理
app.use((req, res) => {
  // 確保 CORS 標頭在 404 回應中也被設置
  const origin = req.headers.origin
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }

  res.status(404).json({
    error: '找不到資源',
    path: req.path,
  })
})

app.listen(PORT, HOST, () => {
  console.log(`伺服器連接成功在 http://${HOST}:${PORT}`)
  console.log(`允許的 CORS 來源: ${allowedOrigins.join(', ')}`)
})
