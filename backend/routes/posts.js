const express = require('express');
const router = express.Router();
const pool = require('../database/connection');

// GET /api/posts - 獲取所有貼文（支援分頁）
// 注意：討論區貼文存儲在 travelers 表中，通過 likes 表的 board='discussion' 區分
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // 查詢討論區貼文（從 travelers 表，通過 likes 表的 board='discussion' 篩選）
    // 注意：排除 author_uid='system' 的系統標記記錄
    const postsQuery = `
      SELECT
        t.*,
        COALESCE(COUNT(DISTINCT CASE WHEN l.author_uid != 'system' THEN l.id END), 0) as likes_count,
        COALESCE(COUNT(DISTINCT c.id), 0) as comments_count
      FROM travelers t
      INNER JOIN likes l ON t.id = l.post_id AND l.board = 'discussion'
      LEFT JOIN comments c ON t.id = c.post_id
      WHERE t.deleted_at IS NULL
      GROUP BY t.id
      ORDER BY t.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const postsResult = await pool.query(postsQuery, [limit, offset]);

    // 查詢總數
    const countResult = await pool.query(`
      SELECT COUNT(DISTINCT t.id) as total
      FROM travelers t
      INNER JOIN likes l ON t.id = l.post_id AND l.board = 'discussion'
      WHERE t.deleted_at IS NULL
    `);
    const total = parseInt(countResult.rows[0].total);

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

    // 獲取討論區貼文，包含按讚數和留言數
    // 注意：排除 author_uid='system' 的系統標記記錄
    const postQuery = `
      SELECT
        t.*,
        COALESCE(COUNT(DISTINCT CASE WHEN l.author_uid != 'system' THEN l.id END), 0) as likes_count,
        COALESCE(COUNT(DISTINCT c.id), 0) as comments_count
      FROM travelers t
      LEFT JOIN likes l ON t.id = l.post_id AND l.board = 'discussion'
      LEFT JOIN comments c ON t.id = c.post_id
      WHERE t.id = $1
        AND t.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM likes
          WHERE post_id = t.id
          AND board = 'discussion'
          LIMIT 1
        )
      GROUP BY t.id
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

// POST /api/posts - 創建新貼文（討論區貼文）
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

    console.log('收到創建討論區貼文請求：', {
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
    const bannerImage = imageUrlsArray.length > 0 ? imageUrlsArray[0] : null;

    // 插入到 travelers 表（討論區貼文也存儲在這裡）
    const insertPostQuery = `
      INSERT INTO travelers (
        author_uid, title, content, banner_image, tags,
        author_name, author_avatar, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const postResult = await pool.query(insertPostQuery, [
      author_uid,
      title,
      content,
      bannerImage,
      tagsArray,
      null, // author_name (從 Firestore 獲取)
      null, // author_avatar (從 Firestore 獲取)
      'open',
    ]);

    const newPost = postResult.rows[0];

    // 在 likes 表中創建一條系統標記記錄，標記這是討論區貼文
    // 使用特殊的 author_uid 'system' 來區分這是類型標記而不是按讚記錄
    // 實際按讚時會創建新的 likes 記錄（author_uid 是真實用戶）
    try {
      await pool.query(
        `INSERT INTO likes (post_id, author_uid, board)
         VALUES ($1, 'system', 'discussion')
         ON CONFLICT DO NOTHING`,
        [newPost.id]
      );
    } catch (likeError) {
      // 如果創建標記失敗，記錄錯誤但不影響貼文創建
      console.warn('創建討論區標記失敗（不影響貼文創建）：', likeError.message);
    }

    console.log('討論區貼文創建成功，ID：', newPost.id);

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

    // 檢查貼文是否存在且是討論區貼文
    const checkResult = await pool.query(`
      SELECT t.id
      FROM travelers t
      WHERE t.id = $1
        AND t.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM likes
          WHERE post_id = t.id
          AND board = 'discussion'
          LIMIT 1
        )
    `, [idNum]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: '貼文不存在' });
    }

    // 更新貼文
    const imageUrlsArray = Array.isArray(image_urls) ? image_urls : [];
    const bannerImage = imageUrlsArray.length > 0 ? imageUrlsArray[0] : null;

    const updateQuery = `
      UPDATE travelers
      SET title = COALESCE($1, title),
          content = COALESCE($2, content),
          tags = COALESCE($3, tags),
          banner_image = COALESCE($4, banner_image),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      title || null,
      content || null,
      tags || null,
      bannerImage,
      idNum
    ]);
    const updatedPost = result.rows[0];
    res.json(updatedPost);
  } catch (error) {
    console.error('更新貼文失敗：', error);
    res.status(500).json({ error: '更新貼文失敗', details: error?.message || String(error) });
  }
});

// DELETE /api/posts/:id - 刪除貼文（軟刪除）
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const idNum = Number(id);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({ error: '貼文 ID 格式錯誤', details: 'id 必須是正整數' });
    }

    // 檢查貼文是否存在且是討論區貼文
    const checkResult = await pool.query(`
      SELECT t.id
      FROM travelers t
      WHERE t.id = $1
        AND t.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM likes
          WHERE post_id = t.id
          AND board = 'discussion'
          LIMIT 1
        )
    `, [idNum]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: '貼文不存在' });
    }

    // 軟刪除貼文
    await pool.query(
      'UPDATE travelers SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [idNum]
    );

    res.json({ message: '貼文已刪除' });
  } catch (error) {
    console.error('刪除貼文失敗：', error);
    res.status(500).json({ error: '刪除貼文失敗', details: error?.message || String(error) });
  }
});

module.exports = router;
