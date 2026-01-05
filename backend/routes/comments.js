const express = require('express');
const router = express.Router();
const pool = require('../database/connection');

// POST /api/posts/:postId/comments - 創建留言
router.post('/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { author_uid, content } = req.body;

    // 驗證必填欄位
    if (!author_uid || !content) {
      return res.status(400).json({
        error: '缺少必填欄位',
        required: ['author_uid', 'content'],
      });
    }

    // 檢查貼文是否存在
    const postCheck = await pool.query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: '貼文不存在' });
    }

    // 插入留言
    const insertCommentQuery = `
      INSERT INTO comments (post_id, author_uid, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await pool.query(insertCommentQuery, [postId, author_uid, content]);
    const newComment = result.rows[0];

    res.status(201).json(newComment);
  } catch (error) {
    console.error('創建留言失敗：', error);
    res.status(500).json({ error: '創建留言失敗', details: error.message });
  }
});
// PUT /api/comments/:id - 更新留言
router.put('/comments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    // 驗證必填欄位
    if (!content) {
      return res.status(400).json({
        error: '缺少必填欄位',
        required: ['content'],
      });
    }

    // 檢查留言是否存在
    const checkResult = await pool.query('SELECT id FROM comments WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: '留言不存在' });
    }

    // 更新留言
    const updateQuery = `
      UPDATE comments
      SET content = $1
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [content, id]);
    const updatedComment = result.rows[0];

    res.json(updatedComment);
  } catch (error) {
    console.error('更新留言失敗：', error);
    res.status(500).json({ error: '更新留言失敗', details: error.message });
  }
});
// DELETE /api/comments/:id - 刪除留言
router.delete('/comments/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 檢查留言是否存在
    const checkResult = await pool.query('SELECT id FROM comments WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: '留言不存在' });
    }

    // 刪除留言
    await pool.query('DELETE FROM comments WHERE id = $1', [id]);

    res.json({ message: '留言已刪除' });
  } catch (error) {
    console.error('刪除留言失敗：', error);
    res.status(500).json({ error: '刪除留言失敗', details: error.message });
  }
});

module.exports = router;
