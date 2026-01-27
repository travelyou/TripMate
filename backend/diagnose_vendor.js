require('dotenv').config()
const pool = require('./database/connection')

async function diagnose() {
  const testUid = 'xH2ceHgGtgPYonvVZeQHYFPd1Ay1'
  const testVendorId = 'vendor-024'

  try {
    const userRes = await pool.query('SELECT uid, email, nickname, role, vendor_id FROM users WHERE uid = $1 OR vendor_id = $2', [testUid, testVendorId])

    const vendorRes = await pool.query('SELECT * FROM vendors WHERE id = $1', [testVendorId])

    const itinByUid = await pool.query('SELECT id, title, author_uid, location FROM itinerary.itineraries WHERE author_uid = $1 LIMIT 5', [testUid])

    const itinByVendorId = await pool.query('SELECT id, title, author_uid, location FROM itinerary.itineraries WHERE author_uid = $1 LIMIT 5', [testVendorId])

    const postByUid = await pool.query('SELECT id, title, author_uid FROM discussion.discussion WHERE author_uid = $1 LIMIT 5', [testUid])

    const postByVendorId = await pool.query('SELECT id, title, author_uid FROM discussion.discussion WHERE author_uid = $1 LIMIT 5', [testVendorId])

    if (itinByUid.rows.length === 0 && itinByVendorId.rows.length === 0) {
    }
    if (postByUid.rows.length === 0 && postByVendorId.rows.length === 0) {
    }

  } catch (e) {
  } finally {
    await pool.end()
  }
}

diagnose()
