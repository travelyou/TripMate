const pool = require('../database/connection')

/**
 * 初始化 vendor_id 序列
 * 確保序列從資料庫中現有的最大編號開始
 */
async function initializeVendorSequence() {
  try {
    // 1. 建立序列（如果不存在）
    await pool.query('CREATE SEQUENCE IF NOT EXISTS vendor_id_seq;')

    // 2. 檢查序列是否已初始化
    const seqResult = await pool.query(
      'SELECT last_value, is_called FROM vendor_id_seq;'
    )

    // 3. 如果序列未被呼叫過，需要根據現有資料初始化
    if (!seqResult.rows[0].is_called || seqResult.rows[0].last_value <= 1) {
      const maxIdResult = await pool.query(`
        SELECT MAX(CAST(SUBSTRING(id FROM 'vendor-(\\d+)') AS INTEGER)) as max_num
        FROM vendors
        WHERE id ~ '^vendor-\\d+$'
      `)

      const maxNum = maxIdResult.rows[0]?.max_num || 0
      if (maxNum > 0) {
        await pool.query('SELECT setval($1, $2, true)', ['vendor_id_seq', maxNum])
        console.log(`✅ [VendorHelper] 序列已初始化至 ${maxNum}`)
      }
    }
  } catch (error) {
    console.error('❌ [VendorHelper] 序列初始化失敗:', error)
    throw new Error('無法初始化廠商編號序列')
  }
}

/**
 * 生成新的 vendor ID（帶重試機制）
 * @param {number} maxRetries - 最大重試次數
 * @returns {Promise<string>} 新的 vendor ID (例如: vendor-001)
 */
async function generateVendorId(maxRetries = 5) {
  let retryCount = 0

  while (retryCount < maxRetries) {
    try {
      // 取得下一個序列值
      const seqResult = await pool.query("SELECT nextval('vendor_id_seq') AS next_val")
      const nextNumber = parseInt(seqResult.rows[0].next_val, 10)
      const newVendorId = `vendor-${String(nextNumber).padStart(3, '0')}`

      console.log(`🆔 [VendorHelper] 嘗試生成 vendor ID: ${newVendorId} (嘗試 ${retryCount + 1}/${maxRetries})`)

      return newVendorId
    } catch (error) {
      retryCount++
      console.warn(`⚠️ [VendorHelper] 生成 ID 失敗，重試 ${retryCount}/${maxRetries}`)

      if (retryCount >= maxRetries) {
        throw new Error('無法生成唯一的 vendor_id，請稍後再試')
      }

      // 指數退避（Exponential Backoff）
      await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, retryCount - 1)))
    }
  }
}

/**
 * 創建 vendor 記錄（帶重試機制處理 ID 衝突）
 * @param {Object} vendorData - 廠商資料
 * @param {string} vendorData.name - 廠商名稱
 * @param {string} vendorData.avatar - 廠商頭像 URL
 * @param {string} vendorData.email - 用戶 Email（用於回退名稱）
 * @returns {Promise<string>} 創建成功的 vendor ID
 */
async function createVendor({ name, avatar, email }) {
  console.log('🏢 [VendorHelper] 開始創建 vendor 記錄...')

  try {
    // 1. 初始化序列
    await initializeVendorSequence()

    // 2. 準備廠商資料
    const vendorName = name || email?.split('@')[0] || '未命名廠商'
    const vendorAvatar = avatar || null

    // 3. 生成並插入 vendor ID（帶重試）
    const maxRetries = 5
    let retryCount = 0
    let createdVendorId = null

    while (retryCount < maxRetries && !createdVendorId) {
      try {
        const newVendorId = await generateVendorId()

        const insertQuery = `
          INSERT INTO vendors (id, name, avatar, created_at, updated_at)
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id
        `

        await pool.query(insertQuery, [newVendorId, vendorName, vendorAvatar])
        createdVendorId = newVendorId

        console.log(`✅ [VendorHelper] Vendor 記錄創建成功: ${newVendorId}`)
        return createdVendorId

      } catch (insertError) {
        // 處理 unique constraint 衝突（ID 已存在）
        if (insertError.code === '23505') {
          retryCount++
          console.warn(`⚠️ [VendorHelper] Vendor ID 衝突，重試 ${retryCount}/${maxRetries}`)

          if (retryCount >= maxRetries) {
            throw new Error('無法生成唯一的 vendor_id，請稍後再試')
          }

          // 指數退避
          await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, retryCount - 1)))
        } else {
          // 其他類型的錯誤直接拋出
          console.error('❌ [VendorHelper] Vendor 創建失敗:', insertError)
          throw insertError
        }
      }
    }

    // 如果所有重試都失敗
    if (!createdVendorId) {
      throw new Error('無法創建廠商記錄：超過最大重試次數')
    }

  } catch (error) {
    console.error('❌ [VendorHelper] createVendor 錯誤:', error)

    // 重新拋出帶有更多上下文的錯誤
    const enhancedError = new Error(`創建廠商記錄失敗: ${error.message}`)
    enhancedError.originalError = error
    enhancedError.code = error.code
    throw enhancedError
  }
}

module.exports = {
  createVendor,
  initializeVendorSequence,
  generateVendorId
}
