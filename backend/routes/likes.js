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
    const { author_uid, board = 'discussion' } = req.body;

    // 驗證必填欄位
    if (!author_uid) {
      return res.status(400).json({
        error: '缺少必填欄位',
        required: ['author_uid'],
      });
    }

    // 根據 board 類型檢查貼文是否存在
    let postCheck;
    if (board === 'discussion') {
      // 討論區貼文在 travelers 表中
      postCheck = await pool.query(`
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
      `, [postIdNum]);
    } else if (board === 'traveler') {
      // 找旅伴貼文在 travelers 表中
      postCheck = await pool.query(`
        SELECT id 
        FROM travelers 
        WHERE id = $1 
          AND deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM likes 
            WHERE post_id = id 
            AND board = 'discussion'
            LIMIT 1
          )
      `, [postIdNum]);
    } else if (board === 'itinerary') {
      // 精選行程在 itineraries 表中
      postCheck = await pool.query('SELECT id FROM itineraries WHERE id = $1', [postIdNum]);
    } else {
      return res.status(400).json({ error: '不支援的 board 類型', details: 'board 必須是 discussion, traveler 或 itinerary' });
    }

    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: '貼文不存在' });
    }

    // 檢查是否已經按讚（使用 likes 表，需要匹配 board）
    const existingLike = await pool.query(
      `SELECT id FROM likes WHERE post_id = $1 AND author_uid = $2 AND board = $3`,
      [postIdNum, author_uid, board]
    );

    if (existingLike.rows.length > 0) {
      // 如果已經按讚，則取消按讚（刪除）
      await pool.query(
        `DELETE FROM likes WHERE post_id = $1 AND author_uid = $2 AND board = $3`,
        [postIdNum, author_uid, board]
      );

      // 獲取更新後的按讚數
      const countResult = await pool.query(
        'SELECT COUNT(*) as count FROM likes WHERE post_id = $1 AND board = $2',
        [postIdNum, board]
      );

      res.json({
        message: '已取消按讚',
        liked: false,
        likesCount: parseInt(countResult.rows[0].count),
      });
    } else {
      // 如果沒有按讚，則添加按讚
      await pool.query(
        `INSERT INTO likes (post_id, author_uid, board) VALUES ($1, $2, $3)`,
        [postIdNum, author_uid, board]
      );

      // 獲取更新後的按讚數（排除系統標記）
      const countResult = await pool.query(
        'SELECT COUNT(*) as count FROM likes WHERE post_id = $1 AND board = $2 AND author_uid != \'system\'',
        [postIdNum, board]
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
    const { author_uid, board = 'discussion' } = req.query; // board 默認為 discussion

    // 獲取按讚總數（根據 board 類型，排除系統標記）
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM likes WHERE post_id = $1 AND board = $2 AND author_uid != \'system\'',
      [postIdNum, board]
    );

    const likesCount = parseInt(countResult.rows[0].count);

    // 如果提供了 author_uid，檢查是否已按讚
    let isLiked = false;
    if (author_uid) {
      const likeCheck = await pool.query(
        `SELECT id FROM likes WHERE post_id = $1 AND author_uid = $2 AND board = $3`,
        [postIdNum, author_uid, board]
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


