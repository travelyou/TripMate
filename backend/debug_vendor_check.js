
require('dotenv').config()
const pool = require('./database/connection')

async function checkData() {
  try {
    const vendors = await pool.query('SELECT * FROM vendors')

    const users = await pool.query('SELECT uid, email, nickname, role, vendor_id FROM users WHERE role = $1 OR vendor_id IS NOT NULL', ['vendor'])

    const specificUsers = await pool.query("SELECT uid, email, nickname, role, vendor_id FROM users WHERE email LIKE '%v111%' OR nickname LIKE '%v111%'")

  } catch (e) {
  } finally {
    await pool.end()
  }
}

checkData()
