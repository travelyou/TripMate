const pool = require('./database/connection')

async function checkUserExists() {
  try {
    const uid = 'EOe9KjGkeud7xGUsFkI4Wkyd27H2'

    const result = await pool.query(
      'SELECT uid, email, nickname, role, vendor_id, created_at, updated_at FROM users WHERE uid = $1',
      [uid]
    )

    if (result.rows.length > 0) {
      const user = result.rows[0]

      if (user.created_at.getTime() === user.updated_at.getTime()) {
      } else {
      }
    }

    await pool.end()
  } catch (err) {
    process.exit(1)
  }
}

checkUserExists()
