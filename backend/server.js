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

const app = express()
const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || '0.0.0.0'

const allowedOrigins = [
  'https://tripmate.zeabur.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true)
      if (allowedOrigins.includes(origin)) return cb(null, true)
      return cb(new Error(`CORS blocked origin: ${origin}`))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)
app.options('*', cors())
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

app.listen(PORT, HOST, () => {
  console.log(`伺服器連接成功在 http://127.0.0.1:${PORT}`)
})
