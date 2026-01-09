const express = require('express');
const router = express.Router();
const pool = require('../database/connection');

// POST /api/posts/:postId/likes - 按讚/取消按讚
router.post('/posts/:postId/likes', async (req, res) => {
  try {
    const { postId } = req.params;
    const postIdNum = Number(postId);
    if (!Number.isInteger(postIdNum) || postIdNum <= 0) {
      return res.status(400).json({ error: '貼文 ID 格式錯誤', details: 'postId 必須是正整數' });
    }
    const { author_uid } = req.body;

    // 驗證必填欄位
    if (!author_uid) {
      return res.status(400).json({
        error: '缺少必填欄位',
        required: ['author_uid'],
      });
    }

    // 檢查貼文是否存在
    const postCheck = await pool.query('SELECT id FROM posts WHERE id = $1', [postIdNum]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: '貼文不存在' });
    }

    // 首先檢查表是否存在以及欄位名稱
    let columnName = 'author_uid';
    try {
      // 嘗試查詢表結構
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'post_likes' 
        AND (column_name = 'author_uid' OR column_name = 'user_id' OR column_name = 'user_uid')
        LIMIT 1;
      `);
      
      if (columnCheck.rows.length > 0) {
        columnName = columnCheck.rows[0].column_name;
        console.log(`使用欄位名稱: ${columnName}`);
      } else {
        // 如果找不到欄位，嘗試創建表
        await pool.query(`
          CREATE TABLE IF NOT EXISTS post_likes (
            id SERIAL PRIMARY KEY,
            post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
            author_uid VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(post_id, author_uid)
          );
        `);
        columnName = 'author_uid';
        console.log('已創建 post_likes 表');
      }
    } catch (tableError) {
      // 如果表不存在，創建表
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS post_likes (
            id SERIAL PRIMARY KEY,
            post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
            author_uid VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(post_id, author_uid)
          );
        `);
        columnName = 'author_uid';
        console.log('已創建 post_likes 表');
      } catch (createError) {
        console.error('創建表失敗：', createError);
        throw new Error(`資料庫表設置失敗: ${createError.message}`);
      }
    }

    // 檢查是否已經按讚（使用動態欄位名稱）
    const existingLike = await pool.query(
      `SELECT id FROM post_likes WHERE post_id = $1 AND ${columnName} = $2`,
      [postIdNum, author_uid]
    );

    if (existingLike.rows.length > 0) {
      // 如果已經按讚，則取消按讚（刪除）
      await pool.query(
        `DELETE FROM post_likes WHERE post_id = $1 AND ${columnName} = $2`,
        [postIdNum, author_uid]
      );

      // 獲取更新後的按讚數
      const countResult = await pool.query(
        'SELECT COUNT(*) as count FROM post_likes WHERE post_id = $1',
        [postIdNum]
      );

      res.json({
        message: '已取消按讚',
        liked: false,
        likesCount: parseInt(countResult.rows[0].count),
      });
    } else {
      // 如果沒有按讚，則添加按讚
      await pool.query(
        `INSERT INTO post_likes (post_id, ${columnName}) VALUES ($1, $2)`,
        [postIdNum, author_uid]
      );

      // 獲取更新後的按讚數
      const countResult = await pool.query(
        'SELECT COUNT(*) as count FROM post_likes WHERE post_id = $1',
        [postIdNum]
      );

      res.json({
        message: '已按讚',
        liked: true,
        likesCount: parseInt(countResult.rows[0].count),
      });
    }
  } catch (error) {
    console.error('按讚操作失敗：', error);
    console.error('錯誤堆疊：', error.stack);
    res.status(500).json({ 
      error: '按讚操作失敗', 
      details: error?.message || String(error),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/posts/:postId/likes - 獲取貼文的按讚數和當前用戶是否已按讚
router.get('/posts/:postId/likes', async (req, res) => {
  try {
    const { postId } = req.params;
    const postIdNum = Number(postId);
    if (!Number.isInteger(postIdNum) || postIdNum <= 0) {
      return res.status(400).json({ error: '貼文 ID 格式錯誤', details: 'postId 必須是正整數' });
    }
    const { author_uid } = req.query; // 可選，用於檢查當前用戶是否已按讚

    // 獲取按讚總數
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM post_likes WHERE post_id = $1',
      [postIdNum]
    );

    const likesCount = parseInt(countResult.rows[0].count);

    // 如果提供了 author_uid，檢查是否已按讚
    let isLiked = false;
    if (author_uid) {
      // 動態檢測欄位名稱
      let columnName = 'author_uid';
      try {
        const columnCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'post_likes' 
          AND (column_name = 'author_uid' OR column_name = 'user_id' OR column_name = 'user_uid')
          LIMIT 1;
        `);
        if (columnCheck.rows.length > 0) {
          columnName = columnCheck.rows[0].column_name;
        }
      } catch (e) {
        // 使用默認值
      }
      
      const likeCheck = await pool.query(
        `SELECT id FROM post_likes WHERE post_id = $1 AND ${columnName} = $2`,
        [postIdNum, author_uid]
      );
      isLiked = likeCheck.rows.length > 0;
    }

    res.json({
      likesCount,
      isLiked,
    });
  } catch (error) {
    console.error('獲取按讚資訊失敗：', error);
    res.status(500).json({ error: '獲取按讚資訊失敗', details: error?.message || String(error) });
  }
});

module.exports = router;


