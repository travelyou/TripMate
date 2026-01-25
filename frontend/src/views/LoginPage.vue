<script setup>
import { auth, db } from '@/firebase/config'
import { useUserStore } from '@/stores/user'
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  deleteUser,
} from 'firebase/auth'
import { Eye as EyeIcon, EyeOff as EyeOffIcon } from 'lucide-vue-next'
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { createOrUpdateUser, getUserProfile } from '@/api/users'
import tripMateIcon from '@/assets/icons/TripMate_icon_white.png'
import loginPageImage from '@/assets/pic/loginPage-removebg.png'
import { showAlert } from '@/utils/alert'

const activeTab = ref('login')

const loginForm = ref({
  email: '',
  password: '',
})

const registerForm = ref({
  realName: '',
  nickname: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'user',
})

const loginErrors = ref({
  email: '',
  password: '',
  general: '',
})
const isLoggingIn = ref(false)

const showLoginPassword = ref(false)
const showRegisterPassword = ref(false)
const showRegisterConfirmPassword = ref(false)

const userStore = useUserStore()
const router = useRouter()

const applyUserProfileToStore = (profileData) => {
  if (typeof userStore.setUserProfile === 'function') {
    userStore.setUserProfile(profileData)
    return
  }
  if (typeof userStore.updateProfile === 'function') {
    userStore.updateProfile({
      id: profileData?.uid,
      uid: profileData?.uid,
      email: profileData?.email,
      nickname: profileData?.nickname,
      name: profileData?.realName || profileData?.nickname,
      avatar: profileData?.avatar,
      bio: profileData?.bio,
      spiritAnimal: profileData?.spiritAnimal,
      role: profileData?.role || 'user',
      vendorId: profileData?.vendorId || null,
    })
  }
}

const handleLogin = async () => {
  if (isLoggingIn.value) return
  isLoggingIn.value = true
  loginForm.value.email = (loginForm.value.email || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, '')
    .replace(/\uFF20/g, '@')
    .replace(/[\uFF0E\u3002\uFF61]/g, '.')

  loginErrors.value = {
    email: '',
    password: '',
    general: '',
  }

  if (!loginForm.value.email) {
    loginErrors.value.email = '請輸入電子信箱'
    return
  }

  if (!loginForm.value.password) {
    loginErrors.value.password = '請輸入密碼'
    return
  }

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      loginForm.value.email,
      loginForm.value.password,
    )

    let userData = {}

    try {
      const userDocRef = doc(db, 'users', userCredential.user.uid)
      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists()) {
        userData = userDoc.data()
      } else {
        userData = {
          nickname:
            userCredential.user.displayName || userCredential.user.email?.split('@')[0] || '用戶',
          email: userCredential.user.email,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userCredential.user.uid}`,
          bio: '',
          spiritAnimal: '',
          createdAt: new Date(),
        }
        await setDoc(userDocRef, userData)
      }
    } catch (error) {
      console.error('獲取 Firestore 用戶資料失敗：', error)
    }

    // 自動修復：檢查並同步Neon資料庫
    try {
      const userRole = userData.role || 'user'
      const vendorId =
        userRole === 'user' || userRole === 'admin'
          ? null
          : userData.vendorId || userData.vendor_id || null

      // 先檢查Neon中是否存在用戶
      let neonUserExists = false
      try {
        const neonUser = await getUserProfile(userCredential.user.uid)
        neonUserExists = neonUser && neonUser.uid
      } catch (checkError) {
        console.log('檢查 Neon 用戶時出錯（可能不存在）：', checkError)
      }

      // 如果Neon中不存在，嘗試創建/更新
      if (!neonUserExists) {
        console.log('檢測到 Neon 資料庫中沒有用戶資料，正在自動修復...')
        try {
          await createOrUpdateUser({
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            nickname: userData.nickname || userCredential.user.email?.split('@')[0] || '用戶',
            location: userData.location || '台灣',
            avatar: userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userCredential.user.uid}`,
            bio: userData.bio || null,
            spirit_animal: userData.spiritAnimal || null,
            role: userRole,
            vendor_id: vendorId,
          })
          console.log('✅ 自動修復成功：Neon 資料庫已同步')
        } catch (syncError) {
          console.error('⚠️ 自動修復失敗（但不影響登入）：', syncError)
          // 不阻止登入，但記錄錯誤
        }
      } else {
        // 如果存在，嘗試更新（確保資料是最新的）
        try {
          await createOrUpdateUser({
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            nickname: userData.nickname || '',
            location: userData.location || '台灣',
            avatar: userData.avatar || '',
            bio: userData.bio || null,
            spirit_animal: userData.spiritAnimal || null,
            role: userRole,
            vendor_id: vendorId,
          })
        } catch (updateError) {
          console.error('更新 Neon 資料庫失敗（但不影響登入）：', updateError)
        }
      }
    } catch (syncError) {
      console.error('同步到 Neon 資料庫失敗（但不影響登入）：', syncError)
    }

    try {
      const neonUserData = await getUserProfile(userCredential.user.uid)
      if (neonUserData) {
        // 優先級順序：1. Neon 資料庫 2. Firebase Auth photoURL 3. Firestore 4. localStorage 5. 默認頭貼
        let avatar = null

        // 1. 優先使用 Neon 資料庫中的頭貼（排除 dicebear 默認頭貼）
        if (neonUserData.avatar && neonUserData.avatar.trim() !== '' && !neonUserData.avatar.includes('dicebear.com')) {
          avatar = neonUserData.avatar
          console.log('✅ 使用 Neon 資料庫中的頭貼')
        }

        // 2. 如果沒有，嘗試使用 Firebase Auth 的 photoURL（排除 dicebear 默認頭貼）
        if (!avatar && userCredential.user.photoURL && userCredential.user.photoURL.trim() !== '' && !userCredential.user.photoURL.includes('dicebear.com')) {
          avatar = userCredential.user.photoURL
          console.log('✅ 使用 Firebase Auth 的 photoURL')
        }

        // 3. 如果沒有，使用 Firestore 的頭貼（排除 dicebear 默認頭貼）
        if (!avatar && userData.avatar && userData.avatar.trim() !== '' && !userData.avatar.includes('dicebear.com')) {
          avatar = userData.avatar
          console.log('✅ 使用 Firestore 的頭貼')
        }

        // 4. 如果沒有，嘗試從 localStorage 恢復（排除 dicebear 默認頭貼）
        let avatarFromLocalStorage = false
        if (!avatar) {
          try {
            const savedAvatar = localStorage.getItem(`user_avatar_${userCredential.user.uid}`)
            if (savedAvatar && savedAvatar.trim() !== '' && !savedAvatar.includes('dicebear.com')) {
              avatar = savedAvatar
              avatarFromLocalStorage = true
              console.log('✅ 使用 localStorage 中的頭貼')
            }
          } catch (e) {
            console.warn('從 localStorage 恢復頭貼失敗:', e)
          }
        }

        // 5. 只有在所有地方都沒有非默認頭貼時，才使用默認頭貼
        if (!avatar) {
          avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userCredential.user.uid}`
          console.log('⚠️ 使用默認頭貼（所有資料源都沒有自定義頭貼）')
        }

        // 如果有有效的頭貼（非默認頭貼），保存到 localStorage 和資料庫
        if (avatar && avatar.trim() !== '' && !avatar.includes('dicebear.com')) {
          // 保存到 localStorage
          try {
            localStorage.setItem(`user_avatar_${userCredential.user.uid}`, avatar)
            console.log('✅ 已保存頭貼到 localStorage')
          } catch (e) {
            console.warn('保存頭貼到 localStorage 失敗:', e)
          }

          // 如果頭貼是從 localStorage 恢復的，或者資料庫中沒有，同步到資料庫
          if (avatarFromLocalStorage || !neonUserData.avatar || neonUserData.avatar.includes('dicebear.com')) {
            try {
              await createOrUpdateUser({
                uid: userCredential.user.uid,
                avatar: avatar
              })
              console.log('✅ 已將頭貼同步到 Neon 資料庫')
            } catch (e) {
              console.warn('同步頭貼到資料庫失敗:', e)
            }
          }

          // 如果 Firebase Auth 的 photoURL 與當前頭貼不同，更新 Firebase Auth
          if (userCredential.user.photoURL !== avatar) {
            try {
              const { updateProfile } = await import('firebase/auth')
              await updateProfile(userCredential.user, {
                photoURL: avatar
              })
              console.log('✅ 已更新 Firebase Auth 的 photoURL')
            } catch (e) {
              console.warn('更新 Firebase Auth photoURL 失敗:', e)
            }
          }
        }

        applyUserProfileToStore({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          nickname: neonUserData.nickname || userData.nickname || '',
          avatar: avatar,
          bio: neonUserData.bio || userData.bio || '',
          spiritAnimal: neonUserData.spirit_animal || userData.spiritAnimal || '',
          role: neonUserData.role || 'user',
          vendorId: neonUserData.vendor_id || null,
        })
      } else {
        // 如果 Neon 中沒有資料，使用以下優先級：1. Firebase Auth photoURL 2. Firestore 3. localStorage 4. 默認頭貼
        let avatar = null

        // 1. 優先使用 Firebase Auth 的 photoURL（排除 dicebear 默認頭貼）
        if (userCredential.user.photoURL && userCredential.user.photoURL.trim() !== '' && !userCredential.user.photoURL.includes('dicebear.com')) {
          avatar = userCredential.user.photoURL
          console.log('✅ 使用 Firebase Auth 的 photoURL')
        }

        // 2. 如果沒有，使用 Firestore 的頭貼（排除 dicebear 默認頭貼）
        if (!avatar && userData.avatar && userData.avatar.trim() !== '' && !userData.avatar.includes('dicebear.com')) {
          avatar = userData.avatar
          console.log('✅ 使用 Firestore 的頭貼')
        }

        // 3. 如果沒有，嘗試從 localStorage 恢復（排除 dicebear 默認頭貼）
        if (!avatar) {
          try {
            const savedAvatar = localStorage.getItem(`user_avatar_${userCredential.user.uid}`)
            if (savedAvatar && savedAvatar.trim() !== '' && !savedAvatar.includes('dicebear.com')) {
              avatar = savedAvatar
              console.log('✅ 使用 localStorage 中的頭貼')
            }
          } catch (e) {
            console.warn('從 localStorage 恢復頭貼失敗:', e)
          }
        }

        // 4. 只有在所有地方都沒有非默認頭貼時，才使用默認頭貼
        if (!avatar) {
          avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userCredential.user.uid}`
          console.log('⚠️ 使用默認頭貼（所有資料源都沒有自定義頭貼）')
        }

        // 如果有有效的頭貼（非默認頭貼），保存到 localStorage 和資料庫
        if (avatar && avatar.trim() !== '' && !avatar.includes('dicebear.com')) {
          // 保存到 localStorage
          try {
            localStorage.setItem(`user_avatar_${userCredential.user.uid}`, avatar)
            console.log('✅ 已保存頭貼到 localStorage')
          } catch (e) {
            console.warn('保存頭貼到 localStorage 失敗:', e)
          }

          // 同步到資料庫
          try {
            await createOrUpdateUser({
              uid: userCredential.user.uid,
              avatar: avatar
            })
            console.log('✅ 已將頭貼同步到 Neon 資料庫')
          } catch (e) {
            console.warn('同步頭貼到資料庫失敗:', e)
          }

          // 如果 Firebase Auth 的 photoURL 與當前頭貼不同，更新 Firebase Auth
          if (userCredential.user.photoURL !== avatar) {
            try {
              const { updateProfile } = await import('firebase/auth')
              await updateProfile(userCredential.user, {
                photoURL: avatar
              })
              console.log('✅ 已更新 Firebase Auth 的 photoURL')
            } catch (e) {
              console.warn('更新 Firebase Auth photoURL 失敗:', e)
            }
          }
        }

        applyUserProfileToStore({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          ...userData,
          avatar: avatar,
          role: userData.role || 'user',
        })
      }
    } catch (loadError) {
      console.error('從 Neon 載入用戶資料失敗，使用 Firestore 資料：', loadError)
      // 如果載入失敗，使用 Firestore 的資料
      let avatar = userData.avatar && userData.avatar.trim() !== ''
        ? userData.avatar
        : null

      // 如果 Firestore 中也沒有，嘗試從 localStorage 恢復
      let avatarFromLocalStorage = false
      if (!avatar) {
        try {
          const savedAvatar = localStorage.getItem(`user_avatar_${userCredential.user.uid}`)
          if (savedAvatar && savedAvatar.trim() !== '') {
            // 如果 localStorage 中有頭貼，使用它（無論是否為 dicebear）
            avatar = savedAvatar
            // 只有非 dicebear 的頭貼才需要同步到資料庫
            if (!savedAvatar.includes('dicebear.com')) {
              avatarFromLocalStorage = true
            }
          } else {
            // 如果 localStorage 中沒有頭貼，表示用戶從未換過頭貼，使用默認頭貼
            avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userCredential.user.uid}`
          }
        } catch (e) {
          console.warn('從 localStorage 恢復頭貼失敗:', e)
          // 如果載入失敗，使用默認頭貼
          avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userCredential.user.uid}`
        }
      }

      // 如果有有效的頭貼，保存到 localStorage
      if (avatar && avatar.trim() !== '') {
        try {
          localStorage.setItem(`user_avatar_${userCredential.user.uid}`, avatar)
        } catch (e) {
          console.warn('保存頭貼到 localStorage 失敗:', e)
        }
      }

      // 如果頭貼是從 localStorage 恢復的，同步到資料庫
      if (avatarFromLocalStorage && avatar && avatar.trim() !== '' && !avatar.includes('dicebear.com')) {
        try {
          await createOrUpdateUser({
            uid: userCredential.user.uid,
            avatar: avatar
          })
          console.log('已將 localStorage 中的頭貼同步到資料庫')
        } catch (e) {
          console.warn('同步頭貼到資料庫失敗:', e)
        }
      }

      applyUserProfileToStore({
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        ...userData,
        avatar: avatar,
        role: userData.role || 'user',
      })
    }

    userStore.login()
    console.log('🚀 正在跳轉到首頁...')
    router.push('/')
  } catch (error) {
    console.error('登入失敗：', error.code, error.message)

    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
      loginErrors.value.email = '該電子信箱不存在或是輸入錯誤'
    } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      loginErrors.value.password = '密碼輸入錯誤'
    } else {
      loginErrors.value.general = '登入失敗：' + error.message
    }
  } finally {
    isLoggingIn.value = false
  }
}

const handleRegister = async () => {
  try {
    registerErrors.value = {
      realName: '',
      nickname: '',
      email: '',
      password: '',
      confirmPassword: '',
      general: '',
    }

    const sanitizeEmail = (raw) => {
      return (raw || '')
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\s+/g, '')
        .replace(/\uFF20/g, '@')
        .replace(/[\uFF0E\u3002\uFF61]/g, '.')
    }

    registerForm.value.email = sanitizeEmail(registerForm.value.email)

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (registerForm.value.nickname) {
      registerForm.value.nickname = registerForm.value.nickname.trim()
    }

    if (!registerForm.value.nickname) {
      registerErrors.value.nickname = '請填寫綽號'
      return
    }
    if (!registerForm.value.email) {
      registerErrors.value.email = '請填寫電子信箱'
      return
    }
    if (!registerForm.value.password) {
      registerErrors.value.password = '請填寫密碼'
      return
    }

    if (!registerForm.value.email.includes('@')) {
      registerErrors.value.email = '電子信箱必須包含@'
      return
    }
    if (!emailRegex.test(registerForm.value.email)) {
      registerErrors.value.email = '請填寫有效的電子信箱格式'
      return
    }

    if (registerForm.value.password.length < 6) {
      registerErrors.value.password = '密碼長度至少需要 6 個字元'
      return
    }

    const hasUpperCase = /[A-Z]/.test(registerForm.value.password)
    const hasLowerCase = /[a-z]/.test(registerForm.value.password)
    const hasNumber = /[0-9]/.test(registerForm.value.password)
    const hasOnlyLettersAndNumbers = /^[A-Za-z0-9]+$/.test(registerForm.value.password)

    if (!hasUpperCase) {
      registerErrors.value.password = '密碼必須包含至少一個大寫字母'
      return
    }
    if (!hasLowerCase) {
      registerErrors.value.password = '密碼必須包含至少一個小寫字母'
      return
    }
    if (!hasNumber) {
      registerErrors.value.password = '密碼必須包含至少一個數字'
      return
    }
    if (!hasOnlyLettersAndNumbers) {
      registerErrors.value.password = '密碼只能包含英文字母和數字'
      return
    }

    if (registerForm.value.password !== registerForm.value.confirmPassword) {
      registerErrors.value.password = '密碼不一致，請重新確認'
      return
    }

    // 先嘗試創建Neon用戶（透過API檢查是否可以連接）
    let neonUserCreated = false
    let userCredential = null
    let userData = null

    try {
      // 先創建Firebase用戶
      userCredential = await createUserWithEmailAndPassword(
        auth,
        registerForm.value.email,
        registerForm.value.password,
      )

      userData = {
        realName: registerForm.value.realName.trim(),
        nickname: registerForm.value.nickname.trim(),
        email: registerForm.value.email,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userCredential.user.uid}`,
        bio: '',
        spiritAnimal: '',
        createdAt: new Date(),
      }

      // 創建Firestore用戶資料
      await setDoc(doc(db, 'users', userCredential.user.uid), userData)

      // 嘗試同步到Neon資料庫
      const finalRole = registerForm.value.role || 'user'
      const vendorId = finalRole === 'vendor' ? null : null

      try {
        await createOrUpdateUser({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          nickname: userData.nickname,
          real_name: userData.realName,
          avatar: userData.avatar,
          bio: userData.bio,
          spirit_animal: userData.spiritAnimal,
          role: finalRole,
          vendor_id: vendorId,
        })
        neonUserCreated = true
        userStore.markAsRecentlyRegistered(userCredential.user.uid)
      } catch (syncError) {
        console.error('同步到 Neon 資料庫失敗，開始回滾：', syncError)

        // 回滾：刪除Firebase用戶和Firestore資料
        try {
          // 刪除Firestore資料
          await deleteDoc(doc(db, 'users', userCredential.user.uid))
        } catch (firestoreError) {
          console.error('刪除 Firestore 資料失敗：', firestoreError)
        }

        try {
          // 刪除Firebase用戶
          await deleteUser(userCredential.user)
        } catch (deleteError) {
          console.error('刪除 Firebase 用戶失敗：', deleteError)
          // 如果刪除失敗，記錄錯誤但繼續拋出原始錯誤
        }

        const errorMessage =
          syncError.response?.data?.error ||
          syncError.response?.data?.details ||
          syncError.response?.data?.message ||
          syncError.message ||
          '未知錯誤'

        // 檢查是否是資料庫連接問題
        if (
          syncError.message?.includes('Failed to fetch') ||
          syncError.message?.includes('NetworkError') ||
          syncError.response?.status === 503
        ) {
          throw new Error(
            '無法連接到資料庫伺服器，註冊已取消。請稍後再試。您可能需要聯繫客服以確認帳戶狀態。'
          )
        }

        throw new Error('資料同步到資料庫失敗：' + errorMessage)
      }
    } catch (error) {
      // 如果Neon同步失敗且Firebase用戶已創建，確保已回滾
      if (userCredential && !neonUserCreated) {
        // 已經在上面嘗試回滾了，這裡只是記錄
        console.error('註冊流程失敗，已嘗試回滾 Firebase 用戶')
      }
      throw error
    }

    // 只有在Neon同步成功後才繼續
    if (userCredential && userData && neonUserCreated) {
      applyUserProfileToStore({
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        ...userData,
      })

      await userStore.logout()

      activeTab.value = 'login'
      loginForm.value.email = registerForm.value.email
      loginForm.value.password = ''

      registerForm.value.password = ''
      registerForm.value.confirmPassword = ''
    }

    await userStore.logout()

    activeTab.value = 'login'
    loginForm.value.email = registerForm.value.email
    loginForm.value.password = ''

    registerForm.value.password = ''
    registerForm.value.confirmPassword = ''
  } catch (error) {
    console.error('註冊失敗：', error.code, error.message)

    // 如果是我们抛出的自定义错误，显示给用户
    if (error.message && !error.code) {
      registerErrors.value.general = error.message
      return
    }

    registerErrors.value = {
      realName: '',
      nickname: '',
      email: '',
      password: '',
      confirmPassword: '',
      general: '',
    }

    if (error.code === 'auth/email-already-in-use') {
      registerErrors.value.email = '此電子信箱已被註冊使用，請使用其他電子信箱或直接登入'
    } else if (error.code === 'auth/weak-password') {
      registerErrors.value.password = '密碼強度不夠，請使用至少 6 個字元，包含大小寫字母和數字'
    } else if (error.code === 'auth/invalid-email') {
      registerErrors.value.email = '電子信箱格式錯誤（請確認沒有空白，並使用例如 name@example.com）'
    } else if (error.code === 'auth/operation-not-allowed') {
      registerErrors.value.general = '此操作不被允許，請聯繫管理員'
    } else if (error.code === 'auth/network-request-failed') {
      registerErrors.value.general = '網路連線失敗，請檢查您的網路連線後再試'
    } else {
      registerErrors.value.general = '註冊失敗：' + (error.message || '未知錯誤，請稍後再試')
    }
  }
}

const handleForgotPassword = async () => {
  try {
    if (!loginForm.value.email) {
      loginErrors.value.email = '請輸入註冊時的電子郵件'
      return
    }
    loginForm.value.email = (loginForm.value.email || '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s+/g, '')
      .replace(/\uFF20/g, '@')
      .replace(/[\uFF0E\u3002\uFF61]/g, '.')
    await sendPasswordResetEmail(auth, loginForm.value.email)
    showAlert('重置密碼郵件已發送至信箱：' + loginForm.value.email + '\n請檢查您的郵箱並點擊重置連結')
  } catch (error) {
    console.error('發送失敗：', error.message)
    loginErrors.value.email = '發送失敗：' + error.message
  }
}

const registerErrors = ref({
  realName: '',
  nickname: '',
  email: '',
  password: '',
  confirmPassword: '',
  general: '',
})
</script>

<template>
  <div class="bg-primary-500 min-h-screen flex flex-col px-4 sm:px-6 lg:px-10 py-6">
    <button
      class="cursor-pointer self-center sm:self-start mb-6 sm:mb-4"
      title="返回首頁"
      @click="router.push('/')"
    >
      <img :src="tripMateIcon" alt="TripMate Logo" class="h-8 sm:h-10 md:h-12 w-auto" />
    </button>

    <div class="flex flex-col lg:flex-row items-center lg:gap-12 flex-1">
      <div class="flex items-center justify-center order-1 lg:order-none w-full lg:w-1/2">
        <img
          :src="loginPageImage"
          alt="loginPage"
          class="w-full max-w-60 md:max-w-md lg:max-w-lg xl:max-w-xl"
        />
      </div>

      <div class="mx-4 sm:mx-10 mb-12 sm:mb-16 mt-4 sm:mt-0 order-2 lg:order-none w-full lg:w-1/2">
        <div class="w-full flex items-center justify-center mb-3">
          <div class="flex w-full max-w-sm items-center justify-center gap-6 sm:gap-8">
            <button
              type="button"
              :class="[
                'pb-2 text-xl sm:text-2xl md:text-3xl font-semibold transition-colors duration-200 border-b-2',
                activeTab === 'login'
                  ? 'text-white border-white'
                  : 'text-gray-300 border-transparent',
              ]"
              @click="activeTab = 'login'"
            >
              登入
            </button>
            <button
              type="button"
              :class="[
                'pb-2 text-xl sm:text-2xl md:text-3xl font-semibold transition-colors duration-200 border-b-2',
                activeTab === 'register'
                  ? 'text-white border-white'
                  : 'text-gray-300 border-transparent',
              ]"
              @click="activeTab = 'register'"
            >
              註冊
            </button>
          </div>
        </div>

        <div class="form-wrapper w-full flex items-center justify-center px-2 sm:px-0">
          <form
            v-if="activeTab === 'login'"
            class="formContainer w-full max-w-lg bg-white rounded-lg shadow-lg p-4 sm:p-5 md:p-6 flex flex-col gap-3"
            @submit.prevent="handleLogin"
          >
            <div class="formInput flex flex-row gap-2">
              <div class="flex flex-col gap-1.5 sm:gap-2 flex-1">
                <label for="email" class="text-base sm:text-lg"> 電子信箱 </label>
                <input
                  id="email"
                  v-model="loginForm.email"
                  :class="[
                    'w-full border-2 rounded-md px-3 py-2 sm:px-4 text-sm sm:text-base text-black placeholder-gray-400',
                    loginErrors.email ? 'border-red-500' : 'border-black',
                  ]"
                  type="email"
                  placeholder="請輸入電子信箱"
                  @input="loginErrors.email = ''"
                />
                <span v-if="loginErrors.email" class="text-red-500 text-sm">{{
                  loginErrors.email
                }}</span>
              </div>
            </div>
            <div class="formInput flex flex-row gap-2">
              <div class="flex flex-col gap-1.5 sm:gap-2 flex-1">
                <label for="password" class="text-base sm:text-lg"> 密碼 </label>
                <div class="relative">
                  <input
                    id="password"
                    v-model="loginForm.password"
                    :class="[
                      'w-full border-2 rounded-md px-3 py-2 sm:px-4 pr-10 text-sm sm:text-base text-black placeholder-gray-400',
                      loginErrors.password ? 'border-red-500' : 'border-black',
                    ]"
                    :type="showLoginPassword ? 'text' : 'password'"
                    placeholder="請輸入密碼"
                    @input="loginErrors.password = ''"
                  />
                  <button
                    type="button"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary-600"
                    :aria-label="showLoginPassword ? '隱藏密碼' : '顯示密碼'"
                    @click="showLoginPassword = !showLoginPassword"
                  >
                    <EyeOffIcon v-if="showLoginPassword" class="w-5 h-5" />
                    <EyeIcon v-else class="w-5 h-5" />
                  </button>
                </div>
                <span v-if="loginErrors.password" class="text-red-500 text-sm">{{
                  loginErrors.password
                }}</span>
              </div>
            </div>
            <div v-if="loginErrors.general" class="text-red-500 text-xs sm:text-sm text-center">
              {{ loginErrors.general }}
            </div>
            <button
              type="submit"
              :disabled="isLoggingIn"
              class="formSubmit w-full mt-8 px-5 py-2 sm:px-6 sm:py-3 bg-primary-500 text-white rounded-xl hover:bg-secondary-600 transition-colors font-bold text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {{ isLoggingIn ? '登入中...' : '登入' }}
            </button>
            <a
              href="#"
              class="block text-center text-xs sm:text-sm text-gray-600 hover:text-primary-500 transition-colors cursor-pointer"
              @click.prevent="handleForgotPassword"
              >忘記密碼?</a
            >
          </form>
          <form
            v-else
            class="formContainer w-full max-w-2xl bg-white rounded-lg shadow-lg p-4 sm:p-5 md:p-6 flex flex-col gap-3"
            @submit.prevent="handleRegister"
          >
            <div class="formInput flex flex-row gap-2">
              <div class="flex flex-col gap-1.5 sm:gap-2 flex-1">
                <label class="text-base sm:text-lg">選擇身分</label>
                <div class="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <label class="flex-1 cursor-pointer">
                    <input
                      v-model="registerForm.role"
                      type="radio"
                      value="user"
                      class="sr-only peer"
                    />
                    <div
                      class="flex items-start gap-2 rounded-lg px-3 py-2 sm:px-4 sm:py-3 transition text-gray-700 peer-checked:bg-primary-500 peer-checked:text-white"
                    >
                      <div class="flex flex-col">
                        <span class="text-sm sm:text-base">一般用戶</span>
                        <span class="text-xs mt-0.5 opacity-80"
                          >可瀏覽、找旅伴、發布找旅伴行程</span
                        >
                      </div>
                    </div>
                  </label>
                  <label class="flex-1 cursor-pointer">
                    <input
                      v-model="registerForm.role"
                      type="radio"
                      value="vendor"
                      class="sr-only peer"
                    />
                    <div
                      class="flex items-start gap-2 rounded-lg px-3 py-2 sm:px-4 sm:py-3 transition text-gray-700 peer-checked:bg-primary-500 peer-checked:text-white"
                    >
                      <div class="flex flex-col">
                        <span class="text-sm sm:text-base">廠商</span>
                        <span class="text-xs mt-0.5 opacity-80"
                          >額外擁有廠商資料、發布精選行程</span
                        >
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <div class="formInput flex flex-row gap-2">
              <div class="flex flex-col gap-1.5 sm:gap-2 flex-1">
                <label for="realName" class="text-sm sm:text-base">姓名</label>
                <input
                  id="realName"
                  v-model="registerForm.realName"
                  :class="[
                    'w-full border-2 rounded-md px-3 py-2 sm:px-4 text-sm sm:text-base text-black placeholder-gray-400',
                    registerErrors.realName ? 'border-red-500' : 'border-black',
                  ]"
                  type="text"
                  placeholder="請輸入本名(不公開)"
                  @input="registerErrors.realName = ''"
                />
                <span v-if="registerErrors.realName" class="text-red-500 text-sm">
                  {{ registerErrors.realName }}
                </span>
              </div>
            </div>
            <div class="formInput flex flex-row gap-2">
              <div class="flex flex-col gap-1.5 sm:gap-2 flex-1">
                <label for="nickname" class="text-sm sm:text-base">暱稱</label>
                <input
                  id="nickname"
                  v-model="registerForm.nickname"
                  :class="[
                    'w-full border-2 rounded-md px-3 py-2 sm:px-4 text-sm sm:text-base text-black placeholder-gray-400',
                    registerErrors.nickname ? 'border-red-500' : 'border-black',
                  ]"
                  type="text"
                  placeholder="請輸入使用者暱稱(公開)"
                  @input="registerErrors.nickname = ''"
                />
                <span v-if="registerErrors.nickname" class="text-red-500 text-sm">
                  {{ registerErrors.nickname }}
                </span>
              </div>
            </div>
            <div class="formInput flex flex-row gap-2">
              <div class="flex flex-col gap-1.5 sm:gap-2 flex-1">
                <label for="email" class="text-sm sm:text-base"> 電子信箱 </label>
                <input
                  id="email"
                  v-model="registerForm.email"
                  :class="[
                    'w-full border-2 rounded-md px-3 py-2 sm:px-4 text-sm sm:text-base text-black placeholder-gray-400',
                    registerErrors.email ? 'border-red-500' : 'border-black',
                  ]"
                  type="email"
                  placeholder="請輸入電子信箱"
                  @input="registerErrors.email = ''"
                />
                <span v-if="registerErrors.email" class="text-red-500 text-sm">
                  {{ registerErrors.email }}
                </span>
              </div>
            </div>
            <div class="formInput flex flex-row gap-2">
              <div class="flex flex-col gap-1.5 sm:gap-2 flex-1">
                <label for="password" class="text-sm sm:text-base"> 密碼 </label>
                <div class="relative">
                  <input
                    id="password"
                    v-model="registerForm.password"
                    :class="[
                      'w-full border-2 rounded-md px-3 py-2 sm:px-4 pr-10 text-sm sm:text-base text-black placeholder-gray-400',
                      registerErrors.password ? 'border-red-500' : 'border-black',
                    ]"
                    :type="showRegisterPassword ? 'text' : 'password'"
                    placeholder="6位以上英、數字，必須包含大小寫"
                    @input="registerErrors.password = ''"
                  />
                  <button
                    type="button"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary-600"
                    :aria-label="showRegisterPassword ? '隱藏密碼' : '顯示密碼'"
                    @click="showRegisterPassword = !showRegisterPassword"
                  >
                    <EyeOffIcon v-if="showRegisterPassword" class="w-5 h-5" />
                    <EyeIcon v-else class="w-5 h-5" />
                  </button>
                </div>
                <span v-if="registerErrors.password" class="text-red-500 text-sm">
                  {{ registerErrors.password }}
                </span>
              </div>
            </div>
            <div class="formInput flex flex-row gap-2">
              <div class="flex flex-col gap-1.5 sm:gap-2 flex-1">
                <label for="confirmPassword" class="text-sm sm:text-base">確認密碼</label>
                <div class="relative">
                  <input
                    id="confirmPassword"
                    v-model="registerForm.confirmPassword"
                    :class="[
                      'w-full border-2 rounded-md px-3 py-2 sm:px-4 pr-10 text-sm sm:text-base text-black placeholder-gray-400',
                      registerErrors.confirmPassword ? 'border-red-500' : 'border-black',
                    ]"
                    :type="showRegisterConfirmPassword ? 'text' : 'password'"
                    placeholder="請再次輸入密碼"
                    @input="registerErrors.confirmPassword = ''"
                  />
                  <button
                    type="button"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary-600"
                    :aria-label="showRegisterConfirmPassword ? '隱藏密碼' : '顯示密碼'"
                    @click="showRegisterConfirmPassword = !showRegisterConfirmPassword"
                  >
                    <EyeOffIcon v-if="showRegisterConfirmPassword" class="w-5 h-5" />
                    <EyeIcon v-else class="w-5 h-5" />
                  </button>
                </div>
                <span v-if="registerErrors.confirmPassword" class="text-red-500 text-sm">
                  {{ registerErrors.confirmPassword }}
                </span>
              </div>
            </div>

            <div v-if="registerErrors.general" class="text-red-500 text-xs sm:text-sm text-center">
              {{ registerErrors.general }}
            </div>
            <button
              type="submit"
              class="formSubmit w-full mt-8 px-5 py-2 sm:px-6 sm:py-3 bg-primary-500 text-white rounded-xl hover:bg-secondary-600 transition-colors font-bold text-sm sm:text-base"
            >
              註冊
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
