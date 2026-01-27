
require('dotenv').config()
const pool = require('./database/connection')

async function checkData() {
  try {
    console.log('--- Checking Vendors Table ---')
    const vendors = await pool.query('SELECT * FROM vendors')
    console.table(vendors.rows)

    console.log('\n--- Checking Users Table (Vendor Info) ---')
    const users = await pool.query('SELECT uid, email, nickname, role, vendor_id FROM users WHERE role = $1 OR vendor_id IS NOT NULL', ['vendor'])
    console.table(users.rows)

    console.log('\n--- Checking Specific User (v111 or similar) ---')
    // Try to find users that might be the test user
    const specificUsers = await pool.query("SELECT uid, email, nickname, role, vendor_id FROM users WHERE email LIKE '%v111%' OR nickname LIKE '%v111%'")
    console.table(specificUsers.rows)

  } catch (e) {
    console.error('Error:', e)
  } finally {
    await pool.end()
  }
}

checkData()
