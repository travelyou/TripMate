/* eslint-env node */
/* global require, module */
const pool = require('../database/connection')

/**
 * 從 users 表獲取用戶資訊
 * @param {string} uid - 用戶 UID
 * @param {string} defaultName - 當找不到用戶時的預設名稱（可選）
 * @returns {Promise<{name: string, avatar: string|null}>} - 用戶名稱和頭像
 */
async function getUserInfo(uid, defaultName = null) {
  try {
    const result = await pool.query(
      `SELECT nickname, name, avatar FROM users WHERE uid = $1`,
      [uid]
    )

    if (result.rows.length > 0) {
      const user = result.rows[0]
      return {
        name: user.nickname || user.name || defaultName || uid,
        avatar: user.avatar || null,
      }
    }

    // 如果在 users 表中找不到用戶，返回預設值
    return {
      name: defaultName || uid,
      avatar: null,
    }
  } catch (error) {
    console.warn(`查詢用戶資訊失敗 (UID: ${uid})，使用預設值：`, error.message)
    return {
      name: defaultName || uid,
      avatar: null,
    }
  }
}

module.exports = {
  getUserInfo,
}

