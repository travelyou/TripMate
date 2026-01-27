require('dotenv').config()
const pool = require('./database/connection')

async function findActualAuthor() {
  try {
    console.log('=== 查找實際的作者資料 ===\n')

    // 1. 找所有行程的作者
    console.log('1. 最近的行程作者 (前10筆):')
    const itineraries = await pool.query(`
      SELECT id, title, author_uid, created_at
      FROM itinerary.itineraries
      ORDER BY created_at DESC
      LIMIT 10
    `)
    console.table(itineraries.rows)

    // 2. 找所有貼文的作者
    console.log('\n2. 最近的貼文作者 (前10筆):')
    const discussions = await pool.query(`
      SELECT id, title, author_uid, created_at
      FROM discussion.discussion
      ORDER BY created_at DESC
      LIMIT 10
    `)
    console.table(discussions.rows)

    // 3. 找出所有廠商用戶
    console.log('\n3. 所有廠商用戶:')
    const vendors = await pool.query(`
      SELECT uid, email, nickname, role, vendor_id
      FROM users
      WHERE role = 'vendor' OR vendor_id IS NOT NULL
    `)
    console.table(vendors.rows)

  } catch (e) {
    console.error('Error:', e)
  } finally {
    await pool.end()
  }
}

findActualAuthor()
