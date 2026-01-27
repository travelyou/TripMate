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
  if (!uid) {
    return {
      name: defaultName || '匿名用戶',
      avatar: null,
    }
  }

  try {
    const result = await pool.query(
      `SELECT nickname, avatar FROM public.users WHERE uid = $1`,
      [uid]
    )

    if (result.rows.length > 0) {
      const user = result.rows[0]
      const nickname = user.nickname
      const avatar = user.avatar

      const finalName = (nickname && nickname.trim() !== '')
        ? nickname
        : (defaultName || '匿名用戶')

      const finalAvatar = (avatar && avatar.trim() !== '') ? avatar : null

      return {
        name: finalName,
        avatar: finalAvatar,
      }
    }
    return {
      name: defaultName || '匿名用戶',
      avatar: null,
    }
  } catch (error) {
    console.warn(`[getUserInfo] 查詢用戶資訊失敗 (UID: ${uid})，使用預設值：`, error.message)
    return {
      name: defaultName || '匿名用戶',
      avatar: null,
    }
  }
}

module.exports = {
  getUserInfo,
}

