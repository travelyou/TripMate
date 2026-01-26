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
    console.log(`[getUserInfo] 查詢用戶資訊，UID: ${uid}, defaultName: ${defaultName}`)
    const result = await pool.query(
      `SELECT nickname, avatar FROM public.users WHERE uid = $1`,
      [uid]
    )

    console.log(`[getUserInfo] 資料庫查詢結果，找到 ${result.rows.length} 筆資料`)

    if (result.rows.length > 0) {
      const user = result.rows[0]
      const nickname = user.nickname
      const avatar = user.avatar

      console.log(`[getUserInfo] 資料庫原始資料:`, {
        nickname: nickname || '(空)',
        avatar: avatar ? `${avatar.substring(0, 50)}...` : '(空)',
      })

      const finalName = (nickname && nickname.trim() !== '')
        ? nickname
        : (defaultName || '匿名用戶')

      const finalAvatar = (avatar && avatar.trim() !== '') ? avatar : null

      console.log(`[getUserInfo] 最終返回:`, {
        name: finalName,
        avatar: finalAvatar ? `${finalAvatar.substring(0, 50)}...` : '(空)',
      })

      return {
        name: finalName,
        avatar: finalAvatar,
      }
    }

    console.log(`[getUserInfo] 資料庫中找不到用戶，使用預設值`)
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

