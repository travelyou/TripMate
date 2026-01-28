const pool = require('../database/connection')

async function initializeVendorSequence() {
  try {
    await pool.query('CREATE SEQUENCE IF NOT EXISTS vendor_id_seq;')

    const seqResult = await pool.query(
      'SELECT last_value, is_called FROM vendor_id_seq;'
    )

    if (!seqResult.rows[0].is_called || seqResult.rows[0].last_value <= 1) {
      const maxIdResult = await pool.query(`
        SELECT MAX(CAST(SUBSTRING(id FROM 'vendor-(\\d+)') AS INTEGER)) as max_num
        FROM vendors
        WHERE id ~ '^vendor-\\d+$'
      `)

      const maxNum = maxIdResult.rows[0]?.max_num || 0
      if (maxNum > 0) {
        await pool.query('SELECT setval($1, $2, true)', ['vendor_id_seq', maxNum])
      }
    }
  } catch (error) {
    throw new Error('無法初始化廠商編號序列')
  }
}

async function generateVendorId(maxRetries = 5) {
  let retryCount = 0

  while (retryCount < maxRetries) {
    try {
      const seqResult = await pool.query("SELECT nextval('vendor_id_seq') AS next_val")
      const nextNumber = parseInt(seqResult.rows[0].next_val, 10)
      const newVendorId = `vendor-${String(nextNumber).padStart(3, '0')}`

      return newVendorId
    } catch (error) {
      retryCount++

      if (retryCount >= maxRetries) {
        throw new Error('無法生成唯一的 vendor_id，請稍後再試')
      }

      await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, retryCount - 1)))
    }
  }
}

async function createVendor({ name, avatar, email }) {
  try {
    await initializeVendorSequence()

    const vendorName = name || email?.split('@')[0] || '未命名廠商'
    const vendorAvatar = avatar || null

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

        return createdVendorId

      } catch (insertError) {
        if (insertError.code === '23505') {
          retryCount++

          if (retryCount >= maxRetries) {
            throw new Error('無法生成唯一的 vendor_id，請稍後再試')
          }

          await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, retryCount - 1)))
        } else {
          throw insertError
        }
      }
    }

    if (!createdVendorId) {
      throw new Error('無法創建廠商記錄：超過最大重試次數')
    }

  } catch (error) {
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
