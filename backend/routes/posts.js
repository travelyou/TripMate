const express = require('express');
const router = express.Router();
const pool = require('../database/connection');

// GET /api/posts - 獲取所有貼文（支援分頁）
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // 查詢貼文，包含按讚數和留言數（用戶資訊從 Firestore 獲取）
    const postsQuery = `
      SELECT 
        p.*,
        COALESCE(COUNT(DISTINCT pl.id), 0) as likes_count,
        COALESCE(COUNT(DISTINCT c.id), 0) as comments_count
      FROM posts p
      LEFT JOIN post_likes pl ON p.id = pl.post_id
      LEFT JOIN comments c ON p.id = c.post_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const postsResult = await pool.query(postsQuery, [limit, offset]);

    // 查詢總數
    const countResult = await pool.query('SELECT COUNT(*) FROM posts');
    const total = parseInt(countResult.rows[0].count);

    // 處理結果，將 counts 轉換為數字
    const posts = postsResult.rows.map(post => ({
      ...post,
      likes_count: parseInt(post.likes_count) || 0,
      comments_count: parseInt(post.comments_count) || 0,
    }));

    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('獲取貼文失敗：', error);
    console.error('錯誤堆疊：', error.stack);
    res.status(500).json({
      error: '獲取貼文失敗',
      details: error?.message || String(error),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/posts/:id - 獲取單個貼文詳情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const idNum = Number(id);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({ error: '貼文 ID 格式錯誤', details: 'id 必須是正整數' });
    }

    // 獲取貼文，包含按讚數和留言數（用戶資訊從 Firestore 獲取）
    const postQuery = `
      SELECT 
        p.*,
        COALESCE(COUNT(DISTINCT pl.id), 0) as likes_count,
        COALESCE(COUNT(DISTINCT c.id), 0) as comments_count
      FROM posts p
      LEFT JOIN post_likes pl ON p.id = pl.post_id
      LEFT JOIN comments c ON p.id = c.post_id
      WHERE p.id = $1
      GROUP BY p.id
    `;

    const postResult = await pool.query(postQuery, [idNum]);

    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: '貼文不存在' });
    }

    const post = postResult.rows[0];

    // 獲取留言（用戶資訊從 Firestore 獲取）
    const commentsResult = await pool.query(
      'SELECT * FROM comments WHERE post_id = $1 ORDER BY created_at ASC',
      [idNum]
    );

    post.commentsData = commentsResult.rows;
    post.comments = parseInt(post.comments_count) || commentsResult.rows.length;
    post.likes = parseInt(post.likes_count) || 0;

    res.json(post);
  } catch (error) {
    console.error('獲取貼文詳情失敗：', error);
    res.status(500).json({ error: '獲取貼文詳情失敗', details: error?.message || String(error) });
  }
});

// POST /api/posts - 創建新貼文
router.post('/', async (req, res) => {
  try {
    const {
      author_uid,
      board = 'general',
      title,
      content,
      image_urls = [],
      tags = [],
    } = req.body;

    console.log('收到創建貼文請求：', {
      author_uid,
      board,
      title: title?.substring(0, 50),
      content: content?.substring(0, 50),
      tagsCount: tags?.length || 0,
      imageUrlsCount: image_urls?.length || 0,
    });

    // 驗證必填欄位
    if (!author_uid || !title || !content) {
      return res.status(400).json({
        error: '缺少必填欄位',
        required: ['author_uid', 'title', 'content'],
        received: {
          hasAuthorUid: !!author_uid,
          hasTitle: !!title,
          hasContent: !!content,
        },
      });
    }

    // 確保 tags 和 image_urls 是陣列
    const tagsArray = Array.isArray(tags) ? tags : [];
    const imageUrlsArray = Array.isArray(image_urls) ? image_urls : [];

    // 插入貼文
    const insertPostQuery = `
      INSERT INTO posts (
        author_uid, board, title, content, tags, image_urls
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const postResult = await pool.query(insertPostQuery, [
      author_uid,
      board,
      title,
      content,
      tagsArray,
      imageUrlsArray,
    ]);

    const newPost = postResult.rows[0];

    console.log('貼文創建成功，ID：', newPost.id);

    res.status(201).json(newPost);
  } catch (error) {
    console.error('創建貼文失敗：', error);
    console.error('錯誤堆疊：', error.stack);
    console.error('請求資料：', req.body);
    res.status(500).json({
      error: '創建貼文失敗',
      details: error?.message || String(error),
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// PUT /api/posts/:id - 更新貼文
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const idNum = Number(id);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({ error: '貼文 ID 格式錯誤', details: 'id 必須是正整數' });
    }
    const { title, content, image_urls, tags } = req.body;

    // 檢查貼文是否存在
    const checkResult = await pool.query('SELECT id FROM posts WHERE id = $1', [idNum]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: '貼文不存在' });
    }

    // 更新貼文
    const updateQuery = `
      UPDATE posts
      SET title = COALESCE($1, title),
          content = COALESCE($2, content),
          tags = COALESCE($3, tags),
          image_urls = COALESCE($4, image_urls),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      title || null,
      content || null,
      tags || null,
      image_urls || null,
      idNum
    ]);
    const updatedPost = result.rows[0];
    res.json(updatedPost);
  } catch (error) {
    console.error('更新貼文失敗：', error);
    res.status(500).json({ error: '更新貼文失敗', details: error?.message || String(error) });
  }
});

// DELETE /api/posts/:id - 刪除貼文
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const idNum = Number(id);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({ error: '貼文 ID 格式錯誤', details: 'id 必須是正整數' });
    }

    // 檢查貼文是否存在
    const checkResult = await pool.query('SELECT id FROM posts WHERE id = $1', [idNum]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: '貼文不存在' });
    }

    // 刪除貼文（CASCADE 會自動刪除相關的標籤、留言、點讚）
    await pool.query('DELETE FROM posts WHERE id = $1', [idNum]);

    res.json({ message: '貼文已刪除' });
  } catch (error) {
    console.error('刪除貼文失敗：', error);
    res.status(500).json({ error: '刪除貼文失敗', details: error?.message || String(error) });
  }
});

module.exports = router;
