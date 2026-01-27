/* eslint-env node */
/* global require, module */
const pool = require('../database/connection')

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
    return {
      name: defaultName || '匿名用戶',
      avatar: null,
    }
  }
}

module.exports = {
  getUserInfo,
}

