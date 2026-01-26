/* eslint-env node */
/**
 * 測試 users 表連接和查詢
 * 用於診斷資料庫連接問題
 * 
 * 用法：
 *   node backend/scripts/test-users-connection.js
 */

const pool = require('../database/connection')
const path = require('path')

// 載入環境變數
require('dotenv').config({ path: path.join(__dirname, '../.env') })

async function testConnection() {
  try {
    console.log('🔍 開始測試資料庫連接...\n')

    // 1. 測試基本連接
    console.log('1️⃣ 測試基本連接...')
    const testResult = await pool.query('SELECT NOW() as current_time, current_database() as db_name, current_user as db_user')
    console.log('✅ 連接成功')
    console.log('   資料庫:', testResult.rows[0].db_name)
    console.log('   用戶:', testResult.rows[0].db_user)
    console.log('   時間:', testResult.rows[0].current_time)
    console.log('')

    // 2. 檢查 search_path
    console.log('2️⃣ 檢查 search_path...')
    const searchPathResult = await pool.query('SHOW search_path')
    console.log('   當前 search_path:', searchPathResult.rows[0].search_path)
    console.log('')

    // 3. 設置 search_path
    console.log('3️⃣ 設置 search_path...')
    await pool.query('SET search_path TO public, travelers, discussion')
    console.log('✅ search_path 已設置')
    console.log('')

    // 4. 檢查 users 表是否存在（不指定 schema）
    console.log('4️⃣ 檢查 users 表（不指定 schema）...')
    try {
      const usersCheck1 = await pool.query(`
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_name = 'users'
      `)
      if (usersCheck1.rows.length > 0) {
        console.log('✅ 找到 users 表:')
        usersCheck1.rows.forEach(row => {
          console.log(`   Schema: ${row.table_schema}, Table: ${row.table_name}`)
        })
      } else {
        console.log('❌ 未找到 users 表')
      }
    } catch (error) {
      console.log('❌ 查詢失敗:', error.message)
    }
    console.log('')

    // 5. 檢查 public.users 表是否存在
    console.log('5️⃣ 檢查 public.users 表...')
    try {
      const usersCheck2 = await pool.query(`
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      `)
      if (usersCheck2.rows.length > 0) {
        console.log('✅ 找到 public.users 表')
      } else {
        console.log('❌ 未找到 public.users 表')
      }
    } catch (error) {
      console.log('❌ 查詢失敗:', error.message)
    }
    console.log('')

    // 6. 嘗試查詢 users 表（不指定 schema）
    console.log('6️⃣ 嘗試查詢 users 表（不指定 schema）...')
    try {
      const usersQuery1 = await pool.query('SELECT COUNT(*) as count FROM users')
      console.log('✅ 查詢成功，用戶數量:', usersQuery1.rows[0].count)
    } catch (error) {
      console.log('❌ 查詢失敗:', error.message)
      console.log('   錯誤代碼:', error.code)
    }
    console.log('')

    // 7. 嘗試查詢 public.users 表
    console.log('7️⃣ 嘗試查詢 public.users 表...')
    try {
      const usersQuery2 = await pool.query('SELECT COUNT(*) as count FROM public.users')
      console.log('✅ 查詢成功，用戶數量:', usersQuery2.rows[0].count)
    } catch (error) {
      console.log('❌ 查詢失敗:', error.message)
      console.log('   錯誤代碼:', error.code)
    }
    console.log('')

    // 8. 檢查 users 表的欄位
    console.log('8️⃣ 檢查 users 表的欄位...')
    try {
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users'
        ORDER BY ordinal_position
      `)
      if (columnsResult.rows.length > 0) {
        console.log('✅ users 表欄位:')
        columnsResult.rows.forEach(col => {
          console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`)
        })
      } else {
        console.log('❌ 未找到欄位資訊')
      }
    } catch (error) {
      console.log('❌ 查詢失敗:', error.message)
    }
    console.log('')

    // 9. 測試插入（如果表存在）
    console.log('9️⃣ 測試插入操作...')
    const testUid = 'test_' + Date.now()
    try {
      const insertResult = await pool.query(`
        INSERT INTO users (uid, email, nickname, role)
        VALUES ($1, $2, $3, $4)
        RETURNING uid, email, nickname, role
      `, [testUid, 'test@example.com', 'Test User', 'user'])
      console.log('✅ 插入成功:', insertResult.rows[0])
      
      // 清理測試資料
      await pool.query('DELETE FROM users WHERE uid = $1', [testUid])
      console.log('✅ 測試資料已清理')
    } catch (error) {
      console.log('❌ 插入失敗:', error.message)
      console.log('   錯誤代碼:', error.code)
    }
    console.log('')

    console.log('✅ 測試完成！')
  } catch (error) {
    console.error('❌ 測試失敗:', error)
    console.error('   錯誤代碼:', error.code)
    console.error('   錯誤詳情:', error.detail)
  } finally {
    await pool.end()
  }
}

// 執行測試
testConnection()

