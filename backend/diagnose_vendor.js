require('dotenv').config()
const pool = require('./database/connection')

async function diagnose() {
  const testUid = 'xH2ceHgGtgPYonvVZeQHYFPd1Ay1'
  const testVendorId = 'vendor-024'

  try {
    console.log('=== 診斷廠商資料關聯 ===\n')

    // 1. 檢查 users 表
    console.log('1. 檢查 users 表:')
    const userRes = await pool.query('SELECT uid, email, nickname, role, vendor_id FROM users WHERE uid = $1 OR vendor_id = $2', [testUid, testVendorId])
    console.table(userRes.rows)

    // 2. 檢查 vendors 表
    console.log('\n2. 檢查 vendors 表:')
    const vendorRes = await pool.query('SELECT * FROM vendors WHERE id = $1', [testVendorId])
    console.table(vendorRes.rows)

    // 3. 檢查行程 (應該用 author_uid)
    console.log('\n3. 檢查行程 (itinerary.itineraries):')
    console.log('   用 testUid 查詢:')
    const itinByUid = await pool.query('SELECT id, title, author_uid, location FROM itinerary.itineraries WHERE author_uid = $1 LIMIT 5', [testUid])
    console.table(itinByUid.rows)

    console.log('   用 testVendorId 查詢:')
    const itinByVendorId = await pool.query('SELECT id, title, author_uid, location FROM itinerary.itineraries WHERE author_uid = $1 LIMIT 5', [testVendorId])
    console.table(itinByVendorId.rows)

    // 4. 檢查貼文 (應該用 author_uid)
    console.log('\n4. 檢查貼文 (discussion.discussion):')
    console.log('   用 testUid 查詢:')
    const postByUid = await pool.query('SELECT id, title, author_uid FROM discussion.discussion WHERE author_uid = $1 LIMIT 5', [testUid])
    console.table(postByUid.rows)

    console.log('   用 testVendorId 查詢:')
    const postByVendorId = await pool.query('SELECT id, title, author_uid FROM discussion.discussion WHERE author_uid = $1 LIMIT 5', [testVendorId])
    console.table(postByVendorId.rows)

    // 5. 總結
    console.log('\n=== 診斷總結 ===')
    console.log(`UID ${testUid} 的行程數量: ${itinByUid.rows.length}`)
    console.log(`UID ${testUid} 的貼文數量: ${postByUid.rows.length}`)
    console.log(`VendorID ${testVendorId} 的行程數量: ${itinByVendorId.rows.length}`)
    console.log(`VendorID ${testVendorId} 的貼文數量: ${postByVendorId.rows.length}`)

    if (itinByUid.rows.length === 0 && itinByVendorId.rows.length === 0) {
      console.log('\n⚠️  結論: 資料庫中沒有這個廠商的行程記錄')
    }
    if (postByUid.rows.length === 0 && postByVendorId.rows.length === 0) {
      console.log('⚠️  結論: 資料庫中沒有這個廠商的貼文記錄')
    }

  } catch (e) {
    console.error('Error:', e)
  } finally {
    await pool.end()
  }
}

diagnose()
