/* eslint-env node */
/* global require, process */
require('dotenv').config();

const express = require('express')
const cors = require('cors')
const pool = require('./database/connection')
const discussionsRouter = require('./routes/discussions')
const commentsRouter = require('./routes/comments')
const likesRouter = require('./routes/likes')
const usersRouter = require('./routes/users')
const travelersRoutes = require('./routes/travelers')

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

app.use(express.json())

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
    allowedOrigins: allowedOrigins
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

// 使用討論區路由
app.use('/api/discussions', discussionsRouter)
// 相容：舊版前端 API 叫 posts，實際上對應 discussion list
app.use('/api/posts', discussionsRouter)

// 使用留言路由
app.use('/api', commentsRouter)

// 使用按讚路由
app.use('/api/likes', likesRouter)

// 使用旅伴路由
app.use('/api/travelers', travelersRoutes)

// 使用用戶路由
app.use('/api/users', usersRouter)

// 相容：若部署環境沒有 /api 前綴（或你想支援兩種路徑），也提供 /discussions
app.use('/discussions', discussionsRouter)

// 全域錯誤處理中間件（確保 CORS 標頭在錯誤時也會被發送）
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('錯誤:', err.message)

  // 確保 CORS 標頭在錯誤回應中也被設置
  const origin = req.headers.origin
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
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
