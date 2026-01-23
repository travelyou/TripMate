/* eslint-env node */
/* global require, process, module */
require('dotenv').config()

const express = require('express')
const http = require('http')
const cors = require('cors')
const { WebSocketServer } = require('ws')
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

const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || '0.0.0.0'

const wss = new WebSocketServer({ server, path: '/ws' })
const wsClients = new Map()

const registerClient = (uid, ws) => {
  if (!uid) return
  let clients = wsClients.get(uid)
  if (!clients) {
    clients = new Set()
    wsClients.set(uid, clients)
  }
  ws._uid = uid
  clients.add(ws)
}

const unregisterClient = (ws) => {
  const uid = ws._uid
  if (!uid) return
  const clients = wsClients.get(uid)
  if (!clients) return
  clients.delete(ws)
  if (clients.size === 0) {
    wsClients.delete(uid)
  }
}

const sendToUid = (uid, payload, excludeWs = null) => {
  const clients = wsClients.get(uid)
  if (!clients || clients.size === 0) return
  const message = JSON.stringify(payload)
  clients.forEach((client) => {
    if (client.readyState !== client.OPEN) return
    if (excludeWs && client === excludeWs) return
    client.send(message)
  })
}

wss.on('connection', (ws, req) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const uid = url.searchParams.get('uid')
    if (uid) {
      registerClient(uid, ws)
    }
  } catch (error) {
    console.warn('WebSocket 連線參數解析失敗:', error.message)
  }

  ws.on('message', (raw) => {
    let data = null
    try {
      data = JSON.parse(raw.toString())
    } catch (error) {
      return
    }
    if (!data || typeof data !== 'object') return

    if (data.type === 'register') {
      registerClient(data.uid, ws)
      return
    }

    if (data.type === 'chat_message') {
      const fromUid = data.fromUid
      const toUid = data.toUid
      if (!fromUid || !toUid) return
      const payload = {
        type: 'chat_message',
        fromUid,
        toUid,
        content: data.content || '',
        isImage: Boolean(data.isImage),
        timestamp: data.timestamp || new Date().toISOString(),
        clientId: data.clientId || null,
        senderName: data.senderName || '',
        senderAvatar: data.senderAvatar || '',
      }
      sendToUid(toUid, payload)
      sendToUid(fromUid, payload, ws)
    }
  })

  ws.on('close', () => {
    unregisterClient(ws)
  })

  ws.on('error', () => {
    unregisterClient(ws)
  })
})

// 1. 修改：加入 Vercel 前端網址到允許清單
const allowedOrigins = [
  'https://tripmate.zeabur.app',
  'https://tripmate-backend.zeabur.app',
  'https://tripmate-mayoyo.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://trip-mate-xi.vercel.app', // 新增你的 Vercel 前端網址
  process.env.ALLOWED_ORIGIN, // 預留給環境變數設定
].filter(Boolean) // 過濾掉空值

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

// 手動處理 OPTIONS 預檢請求
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

// CORS 配置
const corsOptions = {
  origin(origin, cb) {
    if (!origin) {
      return cb(null, true)
    }
    if (allowedOrigins.includes(origin)) {
      return cb(null, true)
    }
    console.log(`CORS: 阻擋來源 ${origin}`)
    return cb(new Error(`CORS blocked origin: ${origin}`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}

app.use(cors(corsOptions))

// 記錄所有請求
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`)
  next()
})

app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true, limit: '20mb' }))

app.get('/', (req, res) => {
  res.json({
    message: 'TripMate 後端 API 服務',
    environment: process.env.VERCEL ? 'Vercel Serverless' : 'Server/Local', // 方便你確認目前跑在哪裡
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
app.use('/discussions', discussionsRouter)
app.use('/api/vendors', require('./routes/vendors'))

// 全域錯誤處理
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const origin = req.headers.origin
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
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
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }

  res.status(404).json({
    error: '找不到資源',
    path: req.path,
  })
})

// 2. 修改：只在非 Vercel 環境下啟動監聽 (Zeabur/Local 依然會執行這裡)
if (!process.env.VERCEL) {
  server.listen(PORT, HOST, () => {
    console.log(`伺服器連接成功在 http://${HOST}:${PORT}`)
    console.log(`允許的 CORS 來源: ${allowedOrigins.join(', ')}`)
  })
}

// 3. 修改：匯出 app 供 Vercel Serverless Function 使用
module.exports = app
