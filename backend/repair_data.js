
require('dotenv').config()
const pool = require('./database/connection')

async function repairData() {
  const uid = 'xH2ceHgGtgPYonvVZeQHYFPd1Ay1' // From screenshot
  const vendorId = 'vendor-024' // From screenshot

  try {
    const vendorRes = await pool.query('SELECT * FROM vendors WHERE id = $1', [vendorId])
    if (vendorRes.rows.length === 0) {
      await pool.query(`
        INSERT INTO vendors (id, name, description, avatar, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
      `, [vendorId, 'V111 Vendor', 'Restored Vendor Data', 'https://placehold.co/100'])
    }

    const userRes = await pool.query('SELECT * FROM users WHERE uid = $1', [uid])

    if (userRes.rows.length === 0) {
      await pool.query(`
        INSERT INTO users (uid, email, nickname, role, vendor_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      `, [uid, 'v111@example.com', 'v111', 'vendor', vendorId])
    } else {
      await pool.query(`
        UPDATE users
        SET role = 'vendor', vendor_id = $1, updated_at = NOW()
        WHERE uid = $2
      `, [vendorId, uid])
    }

    const verifyUser = await pool.query('SELECT uid, nickname, role, vendor_id FROM users WHERE uid = $1', [uid])

  } catch (e) {
  } finally {
    await pool.end()
  }
}

repairData()
