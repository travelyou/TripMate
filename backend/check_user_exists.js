const pool = require('./database/connection')

async function checkUserExists() {
  try {
    const uid = 'EOe9KjGkeud7xGUsFkI4Wkyd27H2'  // test-vendor-final 的 UID

    console.log('\n=== 檢查使用者是否在註冊前就已存在 ===\n')
    console.log('UID:', uid)

    const result = await pool.query(
      'SELECT uid, email, nickname, role, vendor_id, created_at, updated_at FROM users WHERE uid = $1',
      [uid]
    )

    if (result.rows.length > 0) {
      const user = result.rows[0]
      console.log('\n✅ 使用者已存在:\n')
      console.log(user)
      console.log('\nCreated:', user.created_at)
      console.log('Updated:', user.updated_at)

      if (user.created_at.getTime() === user.updated_at.getTime()) {
        console.log('\n📝 這是 INSERT (created_at === updated_at)')
      } else {
        console.log('\n🔄 這是 UPDATE (created_at !== updated_at)')
        console.log('   問題：使用者在註冊前就已經存在了！')
        console.log('   可能原因：登入時的自動修復邏輯創建了這個使用者')
      }
    } else {
      console.log('\n❌ 使用者不存在')
    }

    await pool.end()
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  }
}

checkUserExists()
