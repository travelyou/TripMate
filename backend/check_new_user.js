const pool = require('./database/connection')

async function checkNewUser() {
  try {
    const result = await pool.query(`
      SELECT uid, email, nickname, role, vendor_id, created_at
      FROM users
      WHERE email = 'test-vendor-final@test.com';
    `)

    if (result.rows.length > 0) {
      const user = result.rows[0]

      if (user.role === 'vendor' && user.vendor_id) {
      } else {
        if (user.role !== 'vendor') {
        }
        if (!user.vendor_id) {
        }
      }
    }

    await pool.end()
  } catch (err) {
    process.exit(1)
  }
}

checkNewUser()
