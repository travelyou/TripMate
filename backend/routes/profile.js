/* eslint-env node */
/* global require, module */
const express = require('express');
const router = express.Router();
const pool = require('../database/connection');

// 更具體的路由應該放在通用路由之前
// POST /api/profile/:uid/visited-places - 新增去過的地方
router.post('/:uid/visited-places', async (req, res) => {
  try {
    const { uid } = req.params;
    const { name, date, type, icon } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: '名稱和類型為必填' });
    }

    if (type !== 'domestic' && type !== 'international') {
      return res.status(400).json({ error: '類型必須是 domestic 或 international' });
    }

    const result = await pool.query(
      `INSERT INTO visited_places (user_uid, name, date, type, icon, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [uid, name, date || null, type, icon || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('新增去過的地方失敗：', error);
    res.status(500).json({
      error: '新增去過的地方失敗',
      message: error.message || '未知錯誤'
    });
  }
});

// DELETE /api/profile/:uid/visited-places/:id - 刪除去過的地方
router.delete('/:uid/visited-places/:id', async (req, res) => {
  try {
    const { uid, id } = req.params;

    const result = await pool.query(
      'DELETE FROM visited_places WHERE id = $1 AND user_uid = $2 RETURNING *',
      [id, uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '找不到該記錄' });
    }

    res.json({ success: true, message: '已刪除' });
  } catch (error) {
    console.error('刪除去過的地方失敗：', error);
    res.status(500).json({
      error: '刪除去過的地方失敗',
      message: error.message || '未知錯誤'
    });
  }
});

// POST /api/profile/:uid/wishlist - 新增許願球池項目
router.post('/:uid/wishlist', async (req, res) => {
  try {
    const { uid } = req.params;
    const { item } = req.body;

    if (!item) {
      return res.status(400).json({ error: '項目名稱不能為空' });
    }

    const result = await pool.query(
      `INSERT INTO wishlist (user_uid, item, created_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (user_uid, item) DO NOTHING
       RETURNING *`,
      [uid, item]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ error: '該項目已存在於許願球池中' });
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('新增許願球池項目失敗：', error);
    res.status(500).json({
      error: '新增許願球池項目失敗',
      message: error.message || '未知錯誤'
    });
  }
});

// DELETE /api/profile/:uid/wishlist/:id - 刪除許願球池項目
router.delete('/:uid/wishlist/:id', async (req, res) => {
  try {
    const { uid, id } = req.params;

    const result = await pool.query(
      'DELETE FROM wishlist WHERE id = $1 AND user_uid = $2 RETURNING *',
      [id, uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '找不到該記錄' });
    }

    res.json({ success: true, message: '已刪除' });
  } catch (error) {
    console.error('刪除許願球池項目失敗：', error);
    res.status(500).json({
      error: '刪除許願球池項目失敗',
      message: error.message || '未知錯誤'
    });
  }
});

// PUT /api/profile/:uid/wishlist - 批量更新許願球池
router.put('/:uid/wishlist', async (req, res) => {
  const client = await pool.connect();
  try {
    console.log('收到更新許願球池請求:', req.method, req.path, req.params);
    const { uid } = req.params;
    let { items } = req.body;
    console.log('UID:', uid, 'Items:', items);

    if (!Array.isArray(items)) {
      client.release();
      return res.status(400).json({ error: 'items 必須是陣列' });
    }

    // 去除重複項目（保持順序，保留第一個出現的）
    const uniqueItems = [];
    const seen = new Set();
    for (const item of items) {
      const trimmedItem = String(item).trim();
      if (trimmedItem && !seen.has(trimmedItem)) {
        seen.add(trimmedItem);
        uniqueItems.push(trimmedItem);
      }
    }

    console.log('去重後的 Items:', uniqueItems);

    await client.query('BEGIN');

    // 刪除現有的許願球池
    await client.query('DELETE FROM wishlist WHERE user_uid = $1', [uid]);

    // 插入新的許願球池（使用去重後的項目）
    if (uniqueItems.length > 0) {
      const values = uniqueItems.map((item, index) => {
        const paramIndex = index * 2 + 1;
        return `($${paramIndex}, $${paramIndex + 1}, CURRENT_TIMESTAMP)`;
      }).join(', ');

      const params = uniqueItems.flatMap(item => [uid, item]);
      const query = `INSERT INTO wishlist (user_uid, item, created_at) VALUES ${values}`;

      await client.query(query, params);
    }

    await client.query('COMMIT');
    client.release();

    res.json({ success: true, message: '許願球池已更新', count: uniqueItems.length });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {}); // Ignore rollback errors
    client.release();
    console.error('更新許願球池失敗：', error);
    console.error('錯誤詳情：', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      position: error.position
    });
    res.status(500).json({
      error: '更新許願球池失敗',
      message: error.message || '未知錯誤',
      details: error.detail || String(error)
    });
  }
});

// GET /api/profile/:uid - 獲取用戶完整個人檔案資料（放在最後，作為通用路由）
router.get('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    if (!uid) {
      return res.status(400).json({ error: 'UID 不能為空' });
    }

    // 獲取用戶基本資料
    const userResult = await pool.query('SELECT * FROM users WHERE uid = $1', [uid]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    const user = userResult.rows[0];

    // 獲取去過的地方
    const visitedPlacesResult = await pool.query(
      'SELECT name, date, type, icon FROM visited_places WHERE user_uid = $1 ORDER BY date DESC',
      [uid]
    );

    const visitedPlaces = {
      domestic: visitedPlacesResult.rows.filter(p => p.type === 'domestic').map(p => ({
        name: p.name,
        date: p.date,
        icon: p.icon
      })),
      international: visitedPlacesResult.rows.filter(p => p.type === 'international').map(p => ({
        name: p.name,
        date: p.date,
        icon: p.icon
      }))
    };

    // 獲取許願球池
    const wishlistResult = await pool.query(
      'SELECT item FROM wishlist WHERE user_uid = $1 ORDER BY created_at DESC',
      [uid]
    );
    const wishlist = wishlistResult.rows.map(row => row.item);

    // 獲取好友列表（已接受的好友）
    // 先檢查 friends 表是否存在以及是否有 status 欄位
    let friendsResult;
    try {
      // 嘗試查詢 status 欄位
      const checkStatusQuery = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'friends' AND column_name = 'status'
      `;
      const statusCheck = await pool.query(checkStatusQuery);

      if (statusCheck.rows.length > 0) {
        // 有 status 欄位，使用完整查詢
        friendsResult = await pool.query(
          `SELECT u.uid, u.nickname, u.avatar, u.email
           FROM friends f
           JOIN users u ON (f.friend_uid = u.uid)
           WHERE f.user_uid = $1 AND f.status = 'accepted'
           ORDER BY f.created_at DESC`,
          [uid]
        );
      } else {
        // 沒有 status 欄位，查詢所有好友
        friendsResult = await pool.query(
          `SELECT u.uid, u.nickname, u.avatar, u.email
           FROM friends f
           JOIN users u ON (f.friend_uid = u.uid)
           WHERE f.user_uid = $1
           ORDER BY f.created_at DESC`,
          [uid]
        );
      }
    } catch (error) {
      // 如果 friends 表不存在，返回空陣列
      if (error.code === '42P01') {
        friendsResult = { rows: [] };
      } else {
        throw error;
      }
    }
    const friends = friendsResult.rows.map(f => ({
      id: f.uid,
      name: f.nickname,
      nickname: f.nickname,
      avatar: f.avatar,
      email: f.email
    }));

    // 獲取評價（好評）
    const reviewsResult = await pool.query(
      `SELECT r.*,
              u1.nickname as author_name, u1.avatar as author_avatar,
              u2.nickname as target_name, u2.avatar as target_avatar
       FROM reviews r
       JOIN users u1 ON r.author_uid = u1.uid
       JOIN users u2 ON r.target_uid = u2.uid
       WHERE r.target_uid = $1
       ORDER BY r.created_at DESC`,
      [uid]
    );
    const reviews = reviewsResult.rows.map(r => ({
      id: r.id,
      author: r.author_name,
      target: r.target_name,
      avatar: r.author_avatar,
      targetAvatar: r.target_avatar,
      sentiment: r.sentiment,
      tripTitle: r.trip_id ? `行程 #${r.trip_id}` : null,
      tripId: r.trip_id,
      content: r.content,
      date: r.created_at
    }));

    // 獲取統計資料
    let friendsCountQuery = `(SELECT COUNT(*) FROM friends WHERE user_uid = $1) as friends_count`;
    try {
      // 檢查 friends 表是否有 status 欄位
      const checkStatusQuery = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'friends' AND column_name = 'status'
      `;
      const statusCheck = await pool.query(checkStatusQuery);

      if (statusCheck.rows.length > 0) {
        // 有 status 欄位，過濾已接受的好友
        friendsCountQuery = `(SELECT COUNT(*) FROM friends WHERE user_uid = $1 AND status = 'accepted') as friends_count`;
      }
    } catch {
      // 如果查詢失敗，使用簡單的 COUNT
      friendsCountQuery = `(SELECT 0) as friends_count`;
    }

    const statsResult = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM travelers.travelers WHERE author_uid = $1 AND deleted_at IS NULL) as hosted_trips,
        (SELECT COUNT(*) FROM discussion.discussion WHERE author_uid = $1 AND deleted_at IS NULL) as posts,
        (SELECT COUNT(*) FROM reviews WHERE target_uid = $1) as reviews_count,
        ${friendsCountQuery}`,
      [uid]
    );

    const stats = statsResult.rows[0] || {
      hosted_trips: 0,
      posts: 0,
      reviews_count: 0,
      friends_count: 0
    };

    res.json({
      user: {
        uid: user.uid,
        email: user.email,
        nickname: user.nickname,
        location: user.location || '台灣',
        avatar: user.avatar,
        bio: user.bio,
        spirit_animal: user.spirit_animal,
        role: user.role,
        vendor_id: user.vendor_id,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      visitedPlaces,
      wishlist,
      friends,
      reviews,
      stats: {
        hosted: parseInt(stats.hosted_trips) || 0,
        posts: parseInt(stats.posts) || 0,
        reviews: parseInt(stats.reviews_count) || 0,
        friends: parseInt(stats.friends_count) || 0
      }
    });
  } catch (error) {
    console.error('獲取個人檔案失敗：', error);
    res.status(500).json({
      error: '獲取個人檔案失敗',
      message: error.message || '未知錯誤',
      details: error.detail || String(error)
    });
  }
});

module.exports = router;

