/* eslint-env node */
/* global require, module */
const express = require('express');
const router = express.Router();
const pool = require('../database/connection');

function makeDmKey(a, b) {
  return [a, b].sort().join('|');
}

let ensureChatInit = null;
async function ensureChatTables() {
  if (ensureChatInit) return ensureChatInit;
  ensureChatInit = (async () => {
    // schema
    await pool.query(`CREATE SCHEMA IF NOT EXISTS chat;`);

    // 有些環境你可能先前建過帶外鍵（user_uid -> users.uid）的 members/messages，
    // 但使用者可能尚未同步進 users 表，會導致 23503 外鍵違反。
    // 目前專案（posts/comments/likes）普遍不強制 FK，所以聊天室也採同策略：移除該 FK。
    await pool.query(`ALTER TABLE IF EXISTS chat.members DROP CONSTRAINT IF EXISTS conversation_members_user_uid_fkey;`);
    await pool.query(`ALTER TABLE IF EXISTS chat.members DROP CONSTRAINT IF EXISTS members_user_uid_fkey;`);
    await pool.query(`ALTER TABLE IF EXISTS chat.members DROP CONSTRAINT IF EXISTS conversation_participants_user_uid_fkey;`);
    await pool.query(`ALTER TABLE IF EXISTS chat.messages DROP CONSTRAINT IF EXISTS messages_sender_uid_fkey;`);
    await pool.query(`ALTER TABLE IF EXISTS chat.messages DROP CONSTRAINT IF EXISTS chat_messages_sender_uid_fkey;`);

    // conversations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat.conversations (
        id BIGSERIAL PRIMARY KEY,
        type TEXT NOT NULL DEFAULT 'dm',
        name TEXT,
        avatar_url TEXT,
        dm_key TEXT,
        created_by_uid VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // dm_key 必須 unique，否則 ON CONFLICT (dm_key) 會直接噴錯
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_chat_conversations_dm_key
      ON chat.conversations (dm_key)
      WHERE dm_key IS NOT NULL;
    `);

    // members
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat.members (
        conversation_id BIGINT NOT NULL REFERENCES chat.conversations(id) ON DELETE CASCADE,
        user_uid VARCHAR(255) NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_read_message_id BIGINT,
        PRIMARY KEY (conversation_id, user_uid)
      );
    `);

    // messages
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat.messages (
        id BIGSERIAL PRIMARY KEY,
        conversation_id BIGINT NOT NULL REFERENCES chat.conversations(id) ON DELETE CASCADE,
        sender_uid VARCHAR(255) NOT NULL,
        body TEXT,
        attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        client_message_id TEXT
      );
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_chat_messages_conversation_client_message_id
      ON chat.messages (conversation_id, client_message_id)
      WHERE client_message_id IS NOT NULL;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id_id
      ON chat.messages (conversation_id, id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_members_user_uid
      ON chat.members (user_uid);
    `);
  })().catch((e) => {
    ensureChatInit = null;
    throw e;
  });
  return ensureChatInit;
}

async function ensureMember(conversationId, uid, role = 'member') {
  await pool.query(
    `
    INSERT INTO chat.members (conversation_id, user_uid, role)
    VALUES ($1, $2, $3)
    ON CONFLICT (conversation_id, user_uid) DO NOTHING
    `,
    [conversationId, uid, role],
  );
}

async function assertIsMember(conversationId, uid) {
  const r = await pool.query(
    `SELECT 1 FROM chat.members WHERE conversation_id=$1 AND user_uid=$2`,
    [conversationId, uid],
  );
  if (r.rows.length === 0) {
    const err = new Error('NOT_MEMBER');
    err.status = 403;
    throw err;
  }
}

// 建立/取得 DM
router.post('/dm', async (req, res) => {
  try {
    await ensureChatTables();
    const { uid, otherUid } = req.body;
    if (!uid || !otherUid) {
      return res.status(400).json({ error: '缺少必填欄位', required: ['uid', 'otherUid'] });
    }
    if (uid === otherUid) {
      return res.status(400).json({ error: '不能跟自己建立私聊' });
    }

    const dmKey = makeDmKey(uid, otherUid);

    const convo = await pool.query(
      `
      INSERT INTO chat.conversations (type, dm_key)
      VALUES ('dm', $1)
      ON CONFLICT (dm_key)
      DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      RETURNING *
      `,
      [dmKey],
    );

    const conversation = convo.rows[0];

    await ensureMember(conversation.id, uid, 'member');
    await ensureMember(conversation.id, otherUid, 'member');

    // 盡量回傳對方暱稱/頭像，讓前端標題可直接用 nickname
    let otherUser = null;
    try {
      const u = await pool.query(`SELECT uid, nickname, avatar, email FROM users WHERE uid = $1`, [otherUid]);
      otherUser = u.rows[0] || null;
    } catch {
      // users 表可能尚未有資料，不阻塞
    }

    res.json({
      conversation: {
        ...conversation,
        other_uid: otherUid,
        other_nickname: otherUser?.nickname || (otherUser?.email ? String(otherUser.email).split('@')[0] : null),
        other_avatar: otherUser?.avatar || null,
      },
    });
  } catch (e) {
    console.error('[chat/dm] error:', e);
    res.status(500).json({ error: '建立/取得 DM 失敗', details: e?.message || String(e) });
  }
});

// 建立群組
router.post('/groups', async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureChatTables();
    const { uid, name, memberUids = [] } = req.body;
    if (!uid || !name) {
      return res.status(400).json({ error: '缺少必填欄位', required: ['uid', 'name'] });
    }

    const uniqueMembers = Array.from(new Set([uid, ...memberUids].filter(Boolean)));

    await client.query('BEGIN');

    const convo = await client.query(
      `
      INSERT INTO chat.conversations (type, name, created_by_uid)
      VALUES ('group', $1, $2)
      RETURNING *
      `,
      [name, uid],
    );
    const conversation = convo.rows[0];

    // 建立成員：建立者 owner，其餘 member
    for (const m of uniqueMembers) {
      await client.query(
        `
        INSERT INTO chat.members (conversation_id, user_uid, role)
        VALUES ($1, $2, $3)
        ON CONFLICT (conversation_id, user_uid) DO NOTHING
        `,
        [conversation.id, m, m === uid ? 'owner' : 'member'],
      );
    }

    await client.query('COMMIT');

    res.status(201).json({ conversation });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[chat/groups] error:', e);
    res.status(500).json({ error: '建立群組失敗', details: e?.message || String(e) });
  } finally {
    client.release();
  }
});

// 列出我的聊天室（含最後一則訊息 + 未讀數）
router.get('/conversations', async (req, res) => {
  try {
    await ensureChatTables();
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ error: '缺少 uid' });

    const r = await pool.query(
      `
      SELECT
        c.*,
        ou.other_uid,
        u2.nickname AS other_nickname,
        u2.avatar AS other_avatar,
        lm.id AS last_message_id,
        lm.body AS last_message_body,
        lm.created_at AS last_message_at,
        COALESCE(unread.cnt, 0) AS unread_count
      FROM chat.members m
      JOIN chat.conversations c ON c.id = m.conversation_id
      LEFT JOIN LATERAL (
        SELECT
          CASE
            WHEN c.type <> 'dm' OR c.dm_key IS NULL THEN NULL
            WHEN split_part(c.dm_key, '|', 1) = $1 THEN split_part(c.dm_key, '|', 2)
            ELSE split_part(c.dm_key, '|', 1)
          END AS other_uid
      ) ou ON TRUE
      LEFT JOIN users u2 ON u2.uid = ou.other_uid
      LEFT JOIN LATERAL (
        SELECT id, body, created_at
        FROM chat.messages
        WHERE conversation_id = c.id
        ORDER BY id DESC
        LIMIT 1
      ) lm ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS cnt
        FROM chat.messages msg
        WHERE msg.conversation_id = c.id
          AND (m.last_read_message_id IS NULL OR msg.id > m.last_read_message_id)
          AND msg.sender_uid <> $1
      ) unread ON TRUE
      WHERE m.user_uid = $1
      ORDER BY COALESCE(lm.id, 0) DESC, c.updated_at DESC
      `,
      [uid],
    );

    res.json({ conversations: r.rows });
  } catch (e) {
    console.error('[chat/conversations] error:', e);
    res.status(500).json({ error: '取得聊天室列表失敗', details: e?.message || String(e) });
  }
});

// 拉訊息（分頁）
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    await ensureChatTables();
    const conversationId = Number(req.params.id);
    const { uid, before, limit = 30 } = req.query;

    if (!uid) return res.status(400).json({ error: '缺少 uid' });
    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return res.status(400).json({ error: 'conversation id 格式錯誤' });
    }

    await assertIsMember(conversationId, uid);

    const lim = Math.min(Number(limit) || 30, 50);
    const beforeId = before ? Number(before) : null;

    const params = [conversationId];
    let where = `WHERE conversation_id = $1`;
    if (beforeId && Number.isInteger(beforeId) && beforeId > 0) {
      params.push(beforeId);
      where += ` AND id < $2`;
    }
    params.push(lim);

    const r = await pool.query(
      `
      SELECT *
      FROM chat.messages
      ${where}
      ORDER BY id DESC
      LIMIT $${params.length}
      `,
      params,
    );

    res.json({ messages: r.rows.reverse() });
  } catch (e) {
    const status = e.status || 500;
    console.error('[chat/messages] error:', e);
    res.status(status).json({ error: '取得訊息失敗', details: e?.message || String(e) });
  }
});

// 送訊息（文字 + 附件 URL）
router.post('/conversations/:id/messages', async (req, res) => {
  try {
    await ensureChatTables();
    const conversationId = Number(req.params.id);
    const { uid, body = null, attachments = [], client_message_id = null } = req.body;

    if (!uid) return res.status(400).json({ error: '缺少 uid' });
    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return res.status(400).json({ error: 'conversation id 格式錯誤' });
    }

    await assertIsMember(conversationId, uid);

    const safeAttachments = Array.isArray(attachments) ? attachments : [];
    const hasBody = typeof body === 'string' && body.trim().length > 0;
    const hasAttachments = safeAttachments.length > 0;
    if (!hasBody && !hasAttachments) {
      return res.status(400).json({ error: 'body 或 attachments 至少要有一個' });
    }

    const ins = await pool.query(
      `
      INSERT INTO chat.messages (conversation_id, sender_uid, body, attachments, client_message_id)
      VALUES ($1, $2, $3, $4::jsonb, $5)
      RETURNING *
      `,
      [conversationId, uid, hasBody ? body.trim() : null, JSON.stringify(safeAttachments), client_message_id],
    );

    const message = ins.rows[0];

    // 更新房間時間 + 自己已讀到最新
    await pool.query(`UPDATE chat.conversations SET updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [conversationId]);
    await pool.query(
      `UPDATE chat.members SET last_read_message_id=$1 WHERE conversation_id=$2 AND user_uid=$3`,
      [message.id, conversationId, uid],
    );

    res.status(201).json({ message });
  } catch (e) {
    const status = e.status || 500;
    console.error('[chat/send] error:', e);
    res.status(status).json({ error: '送訊息失敗', details: e?.message || String(e) });
  }
});

// 標記已讀
router.post('/conversations/:id/read', async (req, res) => {
  try {
    await ensureChatTables();
    const conversationId = Number(req.params.id);
    const { uid, lastReadMessageId } = req.body;

    if (!uid) return res.status(400).json({ error: '缺少 uid' });
    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return res.status(400).json({ error: 'conversation id 格式錯誤' });
    }

    await assertIsMember(conversationId, uid);

    const msgId = Number(lastReadMessageId);
    if (!Number.isInteger(msgId) || msgId <= 0) {
      return res.status(400).json({ error: 'lastReadMessageId 格式錯誤' });
    }

    await pool.query(
      `UPDATE chat.members SET last_read_message_id=$1 WHERE conversation_id=$2 AND user_uid=$3`,
      [msgId, conversationId, uid],
    );

    res.json({ ok: true });
  } catch (e) {
    const status = e.status || 500;
    console.error('[chat/read] error:', e);
    res.status(status).json({ error: '標記已讀失敗', details: e?.message || String(e) });
  }
});

module.exports = router;
