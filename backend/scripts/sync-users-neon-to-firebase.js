/* eslint-env node */
const admin = require('firebase-admin')
const pool = require('../database/connection')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '../.env') })

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const forceUpdate = args.includes('--force')
const uidArg = args.find(arg => arg.startsWith('--uid='))
const targetUid = uidArg ? uidArg.split('=')[1] : null

function initFirebase() {
  try {
    if (admin.apps.length > 0) {
      return admin.app()
    }

    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY

    if (serviceAccountKey) {
      let serviceAccount
      try {
        serviceAccount = JSON.parse(serviceAccountKey)
      } catch (e) {
        throw e
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || serviceAccount.project_id
      })

      return admin.app()
    } else {
      process.exit(1)
    }
  } catch (error) {
    process.exit(1)
  }
}

async function getUsersFromNeon() {
  try {
    let query = 'SELECT uid, email, nickname, real_name, avatar, bio, spirit_animal, role, vendor_id, location, is_matching_enabled, created_at, updated_at FROM users'
    const params = []

    if (targetUid) {
      query += ' WHERE uid = $1'
      params.push(targetUid)
    }

    query += ' ORDER BY created_at DESC'

    const result = await pool.query(query, params)
    const users = result.rows

    return users
  } catch (error) {
    throw error
  }
}

async function checkUserExistsInFirebase(uid) {
  try {
    const db = admin.firestore()
    const userDoc = await db.collection('users').doc(uid).get()
    return userDoc.exists ? userDoc.data() : null
  } catch (error) {
    return null
  }
}

async function upsertUserToFirebase(user) {
  try {
    const db = admin.firestore()
    const userRef = db.collection('users').doc(user.uid)

    const firebaseData = {
      uid: user.uid,
      email: user.email || null,
      nickname: user.nickname || null,
      displayName: user.nickname || null,
      realName: user.real_name || null,
      avatar: user.avatar || null,
      photoURL: user.avatar || null,
      bio: user.bio || null,
      spiritAnimal: user.spirit_animal || null,
      spirit_animal: user.spirit_animal || null,
      role: user.role || 'user',
      vendor_id: user.vendor_id || null,
      location: user.location || null,
      is_matching_enabled: user.is_matching_enabled !== undefined ? user.is_matching_enabled : true,
      createdAt: user.created_at ? admin.firestore.Timestamp.fromDate(new Date(user.created_at)) : admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: user.updated_at ? admin.firestore.Timestamp.fromDate(new Date(user.updated_at)) : admin.firestore.FieldValue.serverTimestamp(),
    }

    Object.keys(firebaseData).forEach(key => {
      if (firebaseData[key] === null) {
        delete firebaseData[key]
      }
    })

    await userRef.set(firebaseData, { merge: true })

    const updatedDoc = await userRef.get()
    return updatedDoc.data()
  } catch (error) {
    throw error
  }
}

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
    initFirebase()

    const neonUsers = await getUsersFromNeon()
    stats.total = neonUsers.length

    if (neonUsers.length === 0) {
      return stats
    }

    for (let i = 0; i < neonUsers.length; i++) {
      const user = neonUsers[i]
      const progress = `[${i + 1}/${neonUsers.length}]`

      try {
        const existingUser = await checkUserExistsInFirebase(user.uid)

        if (existingUser) {
          stats.existing++

          if (forceUpdate) {
            if (!isDryRun) {
              await upsertUserToFirebase(user)
              stats.updated++
            }
          } else {
            stats.skipped++
          }
        } else {
          if (!isDryRun) {
            const newUser = await upsertUserToFirebase(user)
            stats.created++
          }
        }
      } catch (error) {
        stats.failed++
      }
    }

  } catch (error) {
    throw error
  }

  return stats
}

function showStats(stats) {
}

async function main() {
  try {
    const stats = await syncUsers()
    showStats(stats)

    process.exit(stats.failed > 0 ? 1 : 0)
  } catch (error) {
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()

