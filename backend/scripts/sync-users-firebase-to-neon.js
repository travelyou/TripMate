/* eslint-disable no-undef */
/**
 * 同步 Firebase Firestore 使用者資料到 Neon 資料庫
 *
 * 用途：
 * - 將 Firebase 中的使用者資料同步到 Neon 資料庫
 * - 修復註冊失敗導致的資料不一致問題
 *
 * 用法：
 *   node backend/scripts/sync-users-firebase-to-neon.js
 *
 * 選項：
 *   --dry-run : 僅檢查，不實際寫入資料
 *   --force   : 強制更新已存在的使用者
 */

const admin = require('firebase-admin')
const pool = require('../database/connection')
const path = require('path')

// 載入環境變數
require('dotenv').config({ path: path.join(__dirname, '../.env') })

// 解析命令列參數
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const forceUpdate = args.includes('--force')

console.log('🔄 Firebase → Neon 使用者資料同步工具')
console.log('==========================================\n')

if (isDryRun) {
  console.log('⚠️  DRY RUN 模式：只檢查，不寫入資料\n')
}

if (forceUpdate) {
  console.log('⚠️  FORCE 模式：將更新已存在的使用者\n')
}

// 初始化 Firebase Admin SDK
function initFirebase() {
  try {
    // 檢查是否已初始化
    if (admin.apps.length > 0) {
      console.log('✅ Firebase Admin 已初始化')
      return admin.app()
    }

    // 從環境變數讀取配置
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY

    if (serviceAccountKey) {
      // 如果是 JSON 字串，解析它
      let serviceAccount
      try {
        serviceAccount = JSON.parse(serviceAccountKey)
      } catch (e) {
        console.error('❌ 無法解析 FIREBASE_SERVICE_ACCOUNT_KEY')
        throw e
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || serviceAccount.project_id
      })

      console.log('✅ Firebase Admin 初始化成功（使用服務帳號金鑰）')
      return admin.app()
    } else {
      console.error('❌ 缺少 Firebase 配置')
      console.error('請在 backend/.env 中設定 FIREBASE_SERVICE_ACCOUNT_KEY')
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Firebase Admin 初始化失敗:', error.message)
    process.exit(1)
  }
}

// 從 Firebase Firestore 獲取所有使用者
async function getUsersFromFirestore() {
  try {
    console.log('📥 從 Firebase Firestore 獲取使用者資料...')

    const db = admin.firestore()
    const usersSnapshot = await db.collection('users').get()

    const users = []
    usersSnapshot.forEach(doc => {
      users.push({
        uid: doc.id,
        ...doc.data()
      })
    })

    console.log(`✅ 找到 ${users.length} 個 Firebase 使用者\n`)
    return users
  } catch (error) {
    console.error('❌ 獲取 Firebase 使用者失敗:', error)
    throw error
  }
}

// 檢查使用者在 Neon 資料庫中是否存在
async function checkUserExistsInNeon(uid) {
  try {
    const result = await pool.query(
      'SELECT uid, nickname, avatar FROM users WHERE uid = $1',
      [uid]
    )
    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error(`檢查使用者 ${uid} 失敗:`, error.message)
    return null
  }
}

// 建立或更新使用者到 Neon 資料庫
async function upsertUserToNeon(user) {
  try {
    const query = `
      INSERT INTO users (
        uid,
        email,
        nickname,
        avatar,
        bio,
        spirit_animal,
        role,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      ON CONFLICT (uid)
      DO UPDATE SET
        email = EXCLUDED.email,
        nickname = COALESCE(EXCLUDED.nickname, users.nickname),
        avatar = COALESCE(EXCLUDED.avatar, users.avatar),
        bio = COALESCE(EXCLUDED.bio, users.bio),
        spirit_animal = COALESCE(EXCLUDED.spirit_animal, users.spirit_animal),
        role = COALESCE(EXCLUDED.role, users.role),
        updated_at = NOW()
      RETURNING uid, nickname, avatar
    `

    const values = [
      user.uid,
      user.email || null,
      user.nickname || user.displayName || null,
      user.avatar || user.photoURL || null,
      user.bio || null,
      user.spiritAnimal || user.spirit_animal || null,
      user.role || 'user'
    ]

    const result = await pool.query(query, values)
    return result.rows[0]
  } catch (error) {
    console.error(`儲存使用者 ${user.uid} 失敗:`, error.message)
    throw error
  }
}

// 主同步函式
async function syncUsers() {
  let stats = {
    total: 0,
    existing: 0,
    created: 0,
    updated: 0,
    failed: 0,
    skipped: 0
  }

  try {
    // 1. 初始化 Firebase
    initFirebase()

    // 2. 從 Firebase 獲取所有使用者
    const firebaseUsers = await getUsersFromFirestore()
    stats.total = firebaseUsers.length

    if (firebaseUsers.length === 0) {
      console.log('⚠️  Firebase 中沒有使用者資料')
      return stats
    }

    console.log('🔍 開始檢查和同步使用者...\n')

    // 3. 逐個檢查和同步
    for (let i = 0; i < firebaseUsers.length; i++) {
      const user = firebaseUsers[i]
      const progress = `[${i + 1}/${firebaseUsers.length}]`

      try {
        // 檢查使用者是否在 Neon 中存在
        const existingUser = await checkUserExistsInNeon(user.uid)

        if (existingUser) {
          stats.existing++

          if (forceUpdate) {
            console.log(`${progress} 更新使用者: ${user.nickname || user.uid}`)

            if (!isDryRun) {
              await upsertUserToNeon(user)
              stats.updated++
            }

            console.log(`  ✅ ${isDryRun ? '[模擬]' : ''} 已更新`)
          } else {
            console.log(`${progress} ⏭️  跳過已存在: ${existingUser.nickname || user.uid}`)
            stats.skipped++
          }
        } else {
          console.log(`${progress} 🆕 新增使用者: ${user.nickname || user.email || user.uid}`)
          console.log(`  Firebase 資料:`)
          console.log(`    - UID: ${user.uid}`)
          console.log(`    - Email: ${user.email || '(無)'}`)
          console.log(`    - Nickname: ${user.nickname || user.displayName || '(無)'}`)
          console.log(`    - Avatar: ${user.avatar ? '有' : '(無)'}`)

          if (!isDryRun) {
            const newUser = await upsertUserToNeon(user)
            stats.created++
            console.log(`  ✅ 已建立到 Neon (暱稱: ${newUser.nickname || '未設定'})`)
          } else {
            console.log(`  ✅ [模擬] 將建立到 Neon`)
          }
        }

        console.log('') // 空行分隔
      } catch (error) {
        stats.failed++
        console.error(`${progress} ❌ 處理失敗: ${user.uid}`)
        console.error(`  錯誤: ${error.message}\n`)
      }
    }

  } catch (error) {
    console.error('\n❌ 同步過程出錯:', error)
    throw error
  }

  return stats
}

// 顯示統計結果
function showStats(stats) {
  console.log('\n==========================================')
  console.log('📊 同步統計')
  console.log('==========================================')
  console.log(`總使用者數:      ${stats.total}`)
  console.log(`已存在:          ${stats.existing}`)
  console.log(`新建立:          ${stats.created} ${isDryRun ? '(模擬)' : ''}`)
  console.log(`已更新:          ${stats.updated} ${isDryRun ? '(模擬)' : ''}`)
  console.log(`跳過:            ${stats.skipped}`)
  console.log(`失敗:            ${stats.failed}`)
  console.log('==========================================\n')

  if (isDryRun) {
    console.log('💡 提示: 這是 DRY RUN 模式，沒有實際寫入資料')
    console.log('   要真正執行同步，請執行:')
    console.log('   node backend/scripts/sync-users-firebase-to-neon.js')
  } else {
    if (stats.created > 0 || stats.updated > 0) {
      console.log('✅ 同步完成！')
    } else if (stats.skipped > 0) {
      console.log('ℹ️  所有使用者都已存在，沒有需要同步的資料')
      console.log('   如果要強制更新所有使用者，請執行:')
      console.log('   node backend/scripts/sync-users-firebase-to-neon.js --force')
    }
  }
}

// 執行同步
async function main() {
  try {
    const stats = await syncUsers()
    showStats(stats)

    process.exit(stats.failed > 0 ? 1 : 0)
  } catch (error) {
    console.error('\n❌ 同步失敗:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// 執行
main()


