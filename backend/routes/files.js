/* eslint-env node */
/* global require, module */
const express = require('express');
const multer = require('multer');
const pool = require('../database/connection');

const router = express.Router();

const MAX_FILE_BYTES = Number(process.env.MAX_FILE_BYTES || 25 * 1024 * 1024); // 25MB default

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
});

let ensured = false;
async function ensureFilesTable() {
  if (ensured) return;
  // 存檔案本體到 Postgres（Neon）
  await pool.query(`
    CREATE TABLE IF NOT EXISTS files (
      id BIGSERIAL PRIMARY KEY,
      folder TEXT,
      uploader_uid VARCHAR(255),
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes BIGINT NOT NULL,
      bytes BYTEA NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  ensured = true;
}

function buildFileUrl(req, id) {
  // 避免依賴 req.protocol（有些反代會改），先用相對路徑就好
  return `${req.baseUrl}/${id}`;
}

function parseRange(rangeHeader, size) {
  // 支援 bytes=start-end
  // 回傳 {start,end} 或 null
  if (!rangeHeader) return null;
  const m = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!m) return null;

  let start = m[1] ? Number(m[1]) : null;
  let end = m[2] ? Number(m[2]) : null;

  if (start === null && end === null) return null;
  if (start !== null && (!Number.isInteger(start) || start < 0)) return null;
  if (end !== null && (!Number.isInteger(end) || end < 0)) return null;

  if (start === null) {
    // bytes=-500 （最後 500 bytes）
    const last = end;
    if (last === null) return null;
    start = Math.max(size - last, 0);
    end = size - 1;
  } else if (end === null) {
    end = size - 1;
  }

  if (start > end || start >= size) return null;
  end = Math.min(end, size - 1);
  return { start, end };
}

// POST /api/files  上傳檔案（存入 Neon）
router.post('/', upload.single('file'), async (req, res) => {
  try {
    await ensureFilesTable();

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: '缺少檔案', details: '請用 multipart/form-data 上傳欄位名為 file 的檔案' });
    }

    const folder = req.body?.folder ? String(req.body.folder) : null;
    const uploaderUid = req.body?.uid ? String(req.body.uid) : null;

    const r = await pool.query(
      `
      INSERT INTO files (folder, uploader_uid, original_name, mime_type, size_bytes, bytes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, folder, uploader_uid, original_name, mime_type, size_bytes, created_at
      `,
      [folder, uploaderUid, file.originalname, file.mimetype || 'application/octet-stream', file.size, file.buffer],
    );

    const saved = r.rows[0];
    res.status(201).json({
      file: {
        id: String(saved.id),
        url: buildFileUrl(req, saved.id),
        folder: saved.folder,
        uploader_uid: saved.uploader_uid,
        originalName: saved.original_name,
        mimeType: saved.mime_type,
        sizeBytes: Number(saved.size_bytes),
        createdAt: saved.created_at,
      },
    });
  } catch (e) {
    if (e?.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: '檔案太大',
        details: `上傳上限為 ${MAX_FILE_BYTES} bytes（可用 MAX_FILE_BYTES 環境變數調整）`,
      });
    }
    res.status(500).json({ error: '上傳檔案失敗', details: e?.message || String(e) });
  }
});

// GET /api/files/:id 下載/預覽檔案（從 Neon 取出）
router.get('/:id', async (req, res) => {
  try {
    await ensureFilesTable();

    const id = req.params.id;
    const idNum = Number(id);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({ error: '檔案 ID 格式錯誤' });
    }

    const r = await pool.query(
      `SELECT id, original_name, mime_type, size_bytes, bytes FROM files WHERE id=$1`,
      [idNum],
    );
    if (r.rows.length === 0) return res.status(404).json({ error: '檔案不存在' });

    const row = r.rows[0];
    const buf = row.bytes; // Buffer
    const size = Number(row.size_bytes);
    const mime = row.mime_type || 'application/octet-stream';
    const name = row.original_name || `file_${row.id}`;

    res.setHeader('Content-Type', mime);
    res.setHeader('Accept-Ranges', 'bytes');

    // 簡易支援 video/audio 的 Range（讓 mp4 可以拖曳）
    const range = parseRange(req.headers.range, size);
    if (range && (mime.startsWith('video/') || mime.startsWith('audio/'))) {
      const { start, end } = range;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
      res.setHeader('Content-Length', String(end - start + 1));
      return res.end(buf.subarray(start, end + 1));
    }

    // 其他類型：整檔回傳
    res.setHeader('Content-Length', String(size));
    // 讓圖片/影片直接 inline 預覽，其他檔案可下載
    const disposition = (mime.startsWith('image/') || mime.startsWith('video/') || mime.startsWith('audio/'))
      ? 'inline'
      : 'attachment';
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(name)}"`);

    return res.end(buf);
  } catch (e) {
    res.status(500).json({ error: '讀取檔案失敗', details: e?.message || String(e) });
  }
});

// DELETE /api/files/:id 刪除檔案（可選）
router.delete('/:id', async (req, res) => {
  try {
    await ensureFilesTable();
    const idNum = Number(req.params.id);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({ error: '檔案 ID 格式錯誤' });
    }
    const r = await pool.query(`DELETE FROM files WHERE id=$1 RETURNING id`, [idNum]);
    if (r.rows.length === 0) return res.status(404).json({ error: '檔案不存在' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: '刪除檔案失敗', details: e?.message || String(e) });
  }
});

module.exports = router;



