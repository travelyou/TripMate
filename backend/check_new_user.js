const pool = require('./database/connection')

async function checkNewUser() {
  try {
    console.log('\n=== 檢查剛註冊的 test-vendor-final ===\n')

    // 查詢這個使用者
    const result = await pool.query(`
      SELECT uid, email, nickname, role, vendor_id, created_at
      FROM users
      WHERE email = 'test-vendor-final@test.com';
    `)

    if (result.rows.length > 0) {
      const user = result.rows[0]
      console.log('✅ 找到使用者:\n')
      console.log('  Email:', user.email)
      console.log('  Nickname:', user.nickname)
      console.log('  Role:', user.role, user.role === 'vendor' ? '✅' : '❌ 應該是 vendor!')
      console.log('  Vendor ID:', user.vendor_id, user.vendor_id ? '✅' : '❌ 應該有值!')
      console.log('  UID:', user.uid)
      console.log('  Created:', user.created_at)

      if (user.role === 'vendor' && user.vendor_id) {
        console.log('\n🎉 成功！Role 和 Vendor ID 都正確！')
      } else {
        console.log('\n❌ 問題：')
        if (user.role !== 'vendor') {
          console.log('  - Role 是', user.role, '而不是 vendor')
        }
        if (!user.vendor_id) {
          console.log('  - Vendor ID 是空的')
        }
      }
    } else {
      console.log('❌ 找不到這個使用者，可能註冊失敗了')
    }

    await pool.end()
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  }
}

checkNewUser()
