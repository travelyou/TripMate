require('dotenv').config()

const express = require('express')
const cors = require('cors')
const pool = require('./database/connection')
const postsRouter = require('./routes/posts')
const commentsRouter = require('./routes/comments')
const likesRouter = require('./routes/likes')
const usersRouter = require('./routes/users')

const app = express()
const PORT = process.env.PORT || 3000
// 一律只用 IPv4：明確綁定到 IPv4 host，避免在部分環境預設走非 IPv4 的監聽位址
const HOST = process.env.HOST || '0.0.0.0'
const travelersRoutes = require('./routes/travelers')

app.use(cors())
app.use(express.json())

// 根路徑處理
app.get('/', (req, res) => {
  res.json({
    message: 'TripMate 後端 API 服務',
    endpoints: {
      test: '/api/test',
      testDb: '/api/test-db',
      posts: '/api/posts',
      comments: '/api/posts/:postId/comments',
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

// 使用貼文路由
app.use('/api/posts', postsRouter)
app.use('/posts', postsRouter)

// 使用留言路由
app.use('/api', commentsRouter)
app.use('/', commentsRouter)

// 使用按讚路由
app.use('/api', likesRouter)
app.use('/', likesRouter)

app.use('/api/travelers', travelersRoutes)

// 使用用戶路由
app.use('/api/users', usersRouter)
app.use('/users', usersRouter)

app.listen(PORT, HOST, () => {
  console.log(`伺服器連接成功在 http://127.0.0.1:${PORT}`)
})
