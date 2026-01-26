/* eslint-env node */
/**
 * 同步 Neon 資料庫使用者資料到 Firebase Firestore
 *
 * 用途：
 * - 將 Neon 中的使用者資料同步到 Firebase Firestore
 * - 統一以 Neon 資料庫為主（Neon 是資料來源）
 * - 修復資料不一致問題
 *
 * 用法：
 *   node backend/scripts/sync-users-neon-to-firebase.js
 *
 * 選項：
 *   --dry-run : 僅檢查，不實際寫入資料
 *   --force   : 強制更新已存在的使用者
 *   --uid     : 只同步指定 UID 的使用者
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
const uidArg = args.find(arg => arg.startsWith('--uid='))
const targetUid = uidArg ? uidArg.split('=')[1] : null

console.log('🔄 Neon → Firebase 使用者資料同步工具（以 Neon 為主）')
console.log('==========================================\n')

if (isDryRun) {
  console.log('⚠️  DRY RUN 模式：只檢查，不寫入資料\n')
}

if (forceUpdate) {
  console.log('⚠️  FORCE 模式：將更新已存在的使用者\n')
}

if (targetUid) {
  console.log(`🎯 目標 UID：${targetUid}\n`)
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

// 從 Neon 資料庫獲取所有使用者
async function getUsersFromNeon() {
  try {
    console.log('📥 從 Neon 資料庫獲取使用者資料...')

    let query = 'SELECT uid, email, nickname, real_name, avatar, bio, spirit_animal, role, vendor_id, location, is_matching_enabled, created_at, updated_at FROM users'
    const params = []

    if (targetUid) {
      query += ' WHERE uid = $1'
      params.push(targetUid)
    }

    query += ' ORDER BY created_at DESC'

    const result = await pool.query(query, params)
    const users = result.rows

    console.log(`✅ 找到 ${users.length} 個 Neon 使用者\n`)
    return users
  } catch (error) {
    console.error('❌ 獲取 Neon 使用者失敗:', error)
    throw error
  }
}

// 檢查使用者在 Firebase Firestore 中是否存在
async function checkUserExistsInFirebase(uid) {
  try {
    const db = admin.firestore()
    const userDoc = await db.collection('users').doc(uid).get()
    return userDoc.exists ? userDoc.data() : null
  } catch (error) {
    console.error(`檢查使用者 ${uid} 失敗:`, error.message)
    return null
  }
}

// 建立或更新使用者到 Firebase Firestore
async function upsertUserToFirebase(user) {
  try {
    const db = admin.firestore()
    const userRef = db.collection('users').doc(user.uid)

    // 準備 Firebase 格式的資料（以 Neon 為主）
    const firebaseData = {
      uid: user.uid,
      email: user.email || null,
      nickname: user.nickname || null,
      displayName: user.nickname || null, // 兼容性
      realName: user.real_name || null,
      avatar: user.avatar || null,
      photoURL: user.avatar || null, // 兼容性
      bio: user.bio || null,
      spiritAnimal: user.spirit_animal || null,
      spirit_animal: user.spirit_animal || null, // 兼容性
      role: user.role || 'user',
      vendor_id: user.vendor_id || null,
      location: user.location || null,
      is_matching_enabled: user.is_matching_enabled !== undefined ? user.is_matching_enabled : true,
      createdAt: user.created_at ? admin.firestore.Timestamp.fromDate(new Date(user.created_at)) : admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: user.updated_at ? admin.firestore.Timestamp.fromDate(new Date(user.updated_at)) : admin.firestore.FieldValue.serverTimestamp(),
    }

    // 移除 null 值（Firebase 不喜歡 null）
    Object.keys(firebaseData).forEach(key => {
      if (firebaseData[key] === null) {
        delete firebaseData[key]
      }
    })

    await userRef.set(firebaseData, { merge: true })

    // 讀取更新後的資料
    const updatedDoc = await userRef.get()
    return updatedDoc.data()
  } catch (error) {
    console.error(`儲存使用者 ${user.uid} 到 Firebase 失敗:`, error.message)
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

    // 2. 從 Neon 獲取所有使用者
    const neonUsers = await getUsersFromNeon()
    stats.total = neonUsers.length

    if (neonUsers.length === 0) {
      console.log('⚠️  Neon 中沒有使用者資料')
      return stats
    }

    console.log('🔍 開始檢查和同步使用者...\n')

    // 3. 逐個檢查和同步
    for (let i = 0; i < neonUsers.length; i++) {
      const user = neonUsers[i]
      const progress = `[${i + 1}/${neonUsers.length}]`

      try {
        // 檢查使用者是否在 Firebase 中存在
        const existingUser = await checkUserExistsInFirebase(user.uid)

        if (existingUser) {
          stats.existing++

          if (forceUpdate) {
            console.log(`${progress} 更新使用者: ${user.nickname || user.email || user.uid}`)
            console.log(`  Neon 資料:`)
            console.log(`    - UID: ${user.uid}`)
            console.log(`    - Email: ${user.email || '(無)'}`)
            console.log(`    - Nickname: ${user.nickname || '(無)'}`)
            console.log(`    - Role: ${user.role || 'user'}`)

            if (!isDryRun) {
              await upsertUserToFirebase(user)
              stats.updated++
            }

            console.log(`  ✅ ${isDryRun ? '[模擬]' : ''} 已更新到 Firebase`)
          } else {
            console.log(`${progress} ⏭️  跳過已存在: ${existingUser.nickname || existingUser.displayName || user.uid}`)
            stats.skipped++
          }
        } else {
          console.log(`${progress} 🆕 新增使用者: ${user.nickname || user.email || user.uid}`)
          console.log(`  Neon 資料:`)
          console.log(`    - UID: ${user.uid}`)
          console.log(`    - Email: ${user.email || '(無)'}`)
          console.log(`    - Nickname: ${user.nickname || '(無)'}`)
          console.log(`    - Avatar: ${user.avatar ? '有' : '(無)'}`)
          console.log(`    - Role: ${user.role || 'user'}`)

          if (!isDryRun) {
            const newUser = await upsertUserToFirebase(user)
            stats.created++
            console.log(`  ✅ 已建立到 Firebase (暱稱: ${newUser.nickname || newUser.displayName || '未設定'})`)
          } else {
            console.log(`  ✅ [模擬] 將建立到 Firebase`)
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
    console.log('   node backend/scripts/sync-users-neon-to-firebase.js')
  } else {
    if (stats.created > 0 || stats.updated > 0) {
      console.log('✅ 同步完成！Firebase 已與 Neon 資料庫同步（以 Neon 為主）')
    } else if (stats.skipped > 0) {
      console.log('ℹ️  所有使用者都已存在，沒有需要同步的資料')
      console.log('   如果要強制更新所有使用者，請執行:')
      console.log('   node backend/scripts/sync-users-neon-to-firebase.js --force')
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

