require('dotenv').config()
const pool = require('./database/connection')

async function findActualAuthor() {
  try {
    const itineraries = await pool.query(`
      SELECT id, title, author_uid, created_at
      FROM itinerary.itineraries
      ORDER BY created_at DESC
      LIMIT 10
    `)

    const discussions = await pool.query(`
      SELECT id, title, author_uid, created_at
      FROM discussion.discussion
      ORDER BY created_at DESC
      LIMIT 10
    `)

    const vendors = await pool.query(`
      SELECT uid, email, nickname, role, vendor_id
      FROM users
      WHERE role = 'vendor' OR vendor_id IS NOT NULL
    `)

  } catch (e) {
  } finally {
    await pool.end()
  }
}

findActualAuthor()
