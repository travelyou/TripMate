// 必須在最開始就加載環境變數，這樣其他模組才能正確讀取
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const https = require('https');
const pool = require('./database/connection');
const postsRouter = require('./routes/posts');
const commentsRouter = require('./routes/comments');
const likesRouter = require('./routes/likes');
const usersRouter = require('./routes/users');

async function loadConfigFromGitHubPages() {
  return new Promise((resolve, reject) => {
    const repoName = process.env.GITHUB_REPO_NAME || 'TripMate';
    const githubUsername = process.env.GITHUB_USERNAME || 'TripMate';
    const configUrl = process.env.GITHUB_PAGES_CONFIG_URL ||
      `https://${githubUsername}.github.io/${repoName}/config/backend-config.json`;
    console.log('從 GitHub Pages 載入環境...');
    console.log('讀取 URL:', configUrl);

    https.get(configUrl, (res) => {
      let data = '';

      if (res.statusCode !== 200) {
        console.warn(`⚠️ GitHub Pages 返回狀態碼 ${res.statusCode}，使用本地 .env`);
        resolve(null);
        return;
      }

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const config = JSON.parse(data);
          console.log('完成 GitHub Pages 環境配置');

          Object.keys(config).forEach(key => {
            if (!process.env[key] || process.env[key] === '') {
              process.env[key] = config[key];
              console.log(`  ✓ ${key}: 已設置`);
            } else {
              console.log(`  - ${key}: 使用本地 .env 值（已存在）`);
            }
          });

          resolve(config);
        } catch (error) {
          console.warn('無法解析 GitHub Pages 配置，使用本地 .env:', error.message);
          resolve(null);
        }
      });
    }).on('error', (error) => {
      console.warn('無法從 GitHub Pages 載入配置，使用本地 .env:', error.message);
      resolve(null);
    });
  });
}

async function startServer() {
  await loadConfigFromGitHubPages();

  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  // 根路徑處理
  app.get('/', (req, res) => {
    res.json({
      message: 'TripMate 後端 API 服務',
      endpoints: {
        test: '/api/test',
        testDb: '/api/test-db',
        posts: '/api/posts',
        comments: '/api/posts/:postId/comments'
      }
    });
  });

  app.get('/api/test', (req, res) => {
    res.json({ message: '後端 API 連接成功！' });
  });

  app.get('/api/test-db', async (req, res) => {
    try {
      const result = await pool.query('SELECT NOW()');
      res.json({
        message: '資料庫連接成功！',
        timestamp: result.rows[0].now
      });
    } catch (error) {
      res.status(500).json({
        error: '資料庫連接失敗',
        details: error.message
      });
    }
  });

  // 使用貼文路由
  app.use('/api/posts', postsRouter);

  // 使用留言路由
  app.use('/api', commentsRouter);

  // 使用按讚路由
  app.use('/api', likesRouter);

  // 使用用戶路由
  app.use('/api/users', usersRouter);

  app.listen(PORT, () => {
    console.log(`伺服器連接成功在 http://localhost:${PORT}`);
  });
}

// 啟動伺服器
startServer().catch((error) => {
  console.error('伺服器啟動失敗:', error);
  process.exit(1);
});
