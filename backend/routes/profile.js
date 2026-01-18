/* eslint-env node */
/* global require, module */
const express = require('express');
const router = express.Router();
const pool = require('../database/connection');

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

router.put('/:uid/wishlist', async (req, res) => {
  const client = await pool.connect();
  try {
    const { uid } = req.params;
    let { items } = req.body;

    if (!Array.isArray(items)) {
      client.release();
      return res.status(400).json({ error: 'items 必須是陣列' });
    }

    const uniqueItems = [];
    const seen = new Set();
    for (const item of items) {
      const trimmedItem = String(item).trim();
      if (trimmedItem && !seen.has(trimmedItem)) {
        seen.add(trimmedItem);
        uniqueItems.push(trimmedItem);
      }
    }

    await client.query('BEGIN');

    await client.query('DELETE FROM wishlist WHERE user_uid = $1', [uid]);
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
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    console.error('更新許願球池失敗：', error);
    res.status(500).json({
      error: '更新許願球池失敗',
      message: error.message || '未知錯誤',
      details: error.detail || String(error)
    });
  }
});

// 加好友 API
router.post('/:uid/friends', async (req, res) => {
  try {
    const { uid } = req.params; // 當前用戶的 uid
    const { friend_uid } = req.body; // 要添加的好友的 uid

    if (!friend_uid) {
      return res.status(400).json({ error: 'friend_uid 為必填欄位' });
    }

    if (uid === friend_uid) {
      return res.status(400).json({ error: '不能加自己為好友' });
    }

    // 檢查好友關係是否已存在
    const existingCheck = await pool.query(
      `SELECT * FROM friends 
       WHERE (user_uid = $1 AND friend_uid = $2) 
          OR (user_uid = $2 AND friend_uid = $1)`,
      [uid, friend_uid]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({ error: '好友關係已存在' });
    }

    // 檢查 friends 表是否有 status 欄位
    const statusCheck = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'friends' AND column_name = 'status'`
    );

    const hasStatus = statusCheck.rows.length > 0;

    // 插入好友關係
    let result;
    if (hasStatus) {
      // 如果有 status 欄位，設置為 'accepted'
      result = await pool.query(
        `INSERT INTO friends (user_uid, friend_uid, status, created_at)
         VALUES ($1, $2, 'accepted', CURRENT_TIMESTAMP)
         RETURNING *`,
        [uid, friend_uid]
      );
    } else {
      // 如果沒有 status 欄位，直接插入
      result = await pool.query(
        `INSERT INTO friends (user_uid, friend_uid, created_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         RETURNING *`,
        [uid, friend_uid]
      );
    }

    res.status(201).json({ 
      success: true, 
      message: '好友添加成功',
      friend: result.rows[0]
    });
  } catch (error) {
    console.error('加好友失敗：', error);
    res.status(500).json({
      error: '加好友失敗',
      message: error.message || '未知錯誤'
    });
  }
});

router.get('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    if (!uid) {
      return res.status(400).json({ error: 'UID 不能為空' });
    }

    const userResult = await pool.query('SELECT * FROM users WHERE uid = $1', [uid]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    const user = userResult.rows[0];

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

    const wishlistResult = await pool.query(
      'SELECT item FROM wishlist WHERE user_uid = $1 ORDER BY created_at DESC',
      [uid]
    );
    const wishlist = wishlistResult.rows.map(row => row.item);

    let friendsResult;
    try {
      const checkStatusQuery = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'friends' AND column_name = 'status'
      `;
      const statusCheck = await pool.query(checkStatusQuery);

      if (statusCheck.rows.length > 0) {
        friendsResult = await pool.query(
          `SELECT u.uid, u.nickname, u.avatar, u.email
           FROM friends f
           JOIN users u ON (f.friend_uid = u.uid)
           WHERE f.user_uid = $1 AND f.status = 'accepted'
           ORDER BY f.created_at DESC`,
          [uid]
        );
      } else {
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

    let friendsCountQuery = `(SELECT COUNT(*) FROM friends WHERE user_uid = $1) as friends_count`;
    try {
      const checkStatusQuery = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'friends' AND column_name = 'status'
      `;
      const statusCheck = await pool.query(checkStatusQuery);

      if (statusCheck.rows.length > 0) {
        friendsCountQuery = `(SELECT COUNT(*) FROM friends WHERE user_uid = $1 AND status = 'accepted') as friends_count`;
      }
    } catch {
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
        tags: Array.isArray(user.tags) ? user.tags : (user.tags ? [user.tags] : []),
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

