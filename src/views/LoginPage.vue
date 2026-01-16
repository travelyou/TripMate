<template>
  <div class="min-h-screen bg-[#fffef7] flex flex-col lg:flex-row relative">
    <button
      class="lg:absolute lg:top-4 lg:left-4 z-10 p-2 sm:p-2 hover:bg-gray-100 rounded-lg transition cursor-pointer mx-auto mt-4 mb-2 lg:mx-0 lg:mt-0 lg:mb-0"
      title="返回首頁"
      @click="router.push('/')"
    >
      <img
        src="@/assets/icons/TripMate_icon.png"
        alt="TripMate Logo"
        class="h-8 sm:h-10 md:h-12 w-auto object-contain"
      />
    </button>
    <div
      class="flex flex-none lg:flex-[2] items-end lg:items-center justify-center p-0 sm:p-3 md:p-4 pb-0 overflow-hidden order-1 lg:order-none -mt-2 sm:mt-0"
    >
      <img
        src="@/assets/pic/loginPage-removebg.png"
        alt="loginPage"
        class="w-60 sm:w-[420px] md:w-[560px] lg:w-[900px] xl:w-[1000px] max-w-full object-contain transform -translate-y-0 sm:-translate-y-10 lg:-translate-y-20 max-h-[40vh] sm:max-h-[50vh] lg:max-h-full"
      />
    </div>

    <div
      class="flex flex-none lg:flex-[3] items-center justify-center sm:p-0 md:p-0 lg:p-0 order-2 lg:order-none min-h-0 lg:-mt-2 sm:mt-0 lg:pt-8"
    >
      <div class="w-full max-w-lg flex flex-col items-center justify-center px-4 sm:px-0">
        <div
          class="w-full flex items-center justify-center gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6"
        >
          <span
            :class="[
              'text-xl sm:text-2xl md:text-3xl font-semibold transition-colors duration-200 cursor-pointer select-none',
              activeTab === 'login' ? 'text-orange-600' : 'text-gray-400',
            ]"
            @click="activeTab = 'login'"
          >
            登入
          </span>
          <button
            type="button"
            class="relative inline-flex h-7 w-14 sm:h-8 sm:w-16 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 shrink-0"
            :class="activeTab === 'login' ? 'bg-orange-600' : 'bg-gray-300'"
            @click="activeTab = activeTab === 'login' ? 'register' : 'login'"
          >
            <span
              class="inline-block h-5 w-5 sm:h-6 sm:w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300"
              :class="activeTab === 'login' ? 'translate-x-1' : 'translate-x-8 sm:translate-x-9'"
            ></span>
          </button>
          <span
            :class="[
              'text-xl sm:text-2xl md:text-3xl font-semibold transition-colors duration-200 cursor-pointer select-none',
              activeTab === 'register' ? 'text-orange-600' : 'text-gray-400',
            ]"
            @click="activeTab = 'register'"
          >
            註冊
          </span>
        </div>

        <div class="form-wrapper w-full flex items-center justify-center px-2 sm:px-0">
          <form
            v-if="activeTab === 'login'"
            class="formContainer w-full max-w-lg bg-white rounded-lg shadow-lg p-4 sm:p-5 md:p-6 space-y-3 sm:space-y-4"
            @submit.prevent="handleLogin"
          >
            <div class="formInput flex flex-row gap-2">
              <div class="flex flex-col gap-1.5 sm:gap-2 flex-1">
                <label for="email" class="text-sm sm:text-base">
                  電子信箱
                  <span class="text-sm text-gray-500 font-normal block sm:inline">(必須包含@)</span>
                </label>
                <input
                  id="email"
                  v-model="loginForm.email"
                  :class="[
                    'w-full border-2 px-3 py-2 sm:px-4 text-sm sm:text-base',
                    loginErrors.email ? 'border-red-500' : 'border-black',
                  ]"
                  type="email"
                  placeholder="請輸入電子信箱(必須包含@)"
                  @input="loginErrors.email = ''"
                />
                <span v-if="loginErrors.email" class="text-red-500 text-sm">{{
                  loginErrors.email
                }}</span>
              </div>
            </div>
            <div class="formInput flex flex-row gap-2">
              <div class="flex flex-col gap-1.5 sm:gap-2 flex-1">
                <label for="password" class="text-sm sm:text-base">
                  密碼
                  <span class="text-xs text-gray-500 font-normal block sm:inline"
                    >(6位以上英、數字，必須包含大小寫)</span
                  >
                </label>
                <input
                  id="password"
                  v-model="loginForm.password"
                  :class="[
                    'w-full border-2 px-3 py-2 sm:px-4 text-sm sm:text-base',
                    loginErrors.password ? 'border-red-500' : 'border-black',
                  ]"
                  type="password"
                  placeholder="請輸入密碼(6位以上英、數字，必須包含大小寫)"
                  @input="loginErrors.password = ''"
                />
                <span v-if="loginErrors.password" class="text-red-500 text-sm">{{
                  loginErrors.password
                }}</span>
              </div>
            </div>
            <div v-if="loginErrors.general" class="text-red-500 text-sm text-center">
              {{ loginErrors.general }}
            </div>
            <button
              type="submit"
              class="formSubmit block mx-auto text-center px-5 py-2.5 sm:px-6 sm:py-3 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition-colors font-bold text-sm sm:text-base w-full sm:w-auto"
            >
              登入
            </button>
            <a
              href="#"
              class="block text-center text-xs sm:text-sm text-gray-600 hover:text-orange-600 transition-colors cursor-pointer"
              @click.prevent="handleForgotPassword"
              >忘記密碼?</a
            >
          </form>
          <form
            v-else
            class="formContainer w-full max-w-lg bg-white rounded-lg shadow-lg p-4 sm:p-5 md:p-6 space-y-3 sm:space-y-4"
            @submit.prevent="handleRegister"
          >
            <div class="formInput flex flex-row gap-2">
              <div class="flex flex-col gap-1.5 sm:gap-2 flex-1">
                <label class="text-sm sm:text-base mb-2">註冊身分</label>
                <div class="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <label class="flex items-start cursor-pointer flex-1">
                    <input
                      v-model="registerForm.role"
                      type="radio"
                      value="user"
                      class="mr-2 w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500 mt-0.5 flex-shrink-0"
                    />
                    <div class="flex flex-col">
                      <span class="text-sm sm:text-base">一般用戶</span>
                      <span class="text-xs text-gray-500 mt-0.5"
                        >可瀏覽、找旅伴、發布找旅伴行程</span
                      >
                    </div>
                  </label>
                  <label class="flex items-start cursor-pointer flex-1">
                    <input
                      v-model="registerForm.role"
                      type="radio"
                      value="vendor"
                      class="mr-2 w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500 mt-0.5 flex-shrink-0"
                    />
                    <div class="flex flex-col">
                      <span class="text-sm sm:text-base">廠商</span>
                      <span class="text-xs text-gray-500 mt-0.5"
                        >額外擁有廠商資料、發布精選行程</span
                      >
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
                    'w-full border-2 px-3 py-2 sm:px-4 text-sm sm:text-base',
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
                <label for="nickname" class="text-sm sm:text-base">暱稱(公開)</label>
                <input
                  id="nickname"
                  v-model="registerForm.nickname"
                  :class="[
                    'w-full border-2 px-3 py-2 sm:px-4 text-sm sm:text-base',
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
                <label for="email" class="text-sm sm:text-base">
                  電子信箱
                  <span class="text-xs text-gray-500 font-normal block sm:inline">(必須包含@)</span>
                </label>
                <input
                  id="email"
                  v-model="registerForm.email"
                  :class="[
                    'w-full border-2 px-3 py-2 sm:px-4 text-sm sm:text-base',
                    registerErrors.email ? 'border-red-500' : 'border-black',
                  ]"
                  type="email"
                  placeholder="請輸入電子信箱(必須包含@)"
                  @input="registerErrors.email = ''"
                />
                <span v-if="registerErrors.email" class="text-red-500 text-sm">
                  {{ registerErrors.email }}
                </span>
              </div>
            </div>
            <div class="formInput flex flex-row gap-2">
              <div class="flex flex-col gap-1.5 sm:gap-2 flex-1">
                <label for="password" class="text-sm sm:text-base">
                  密碼
                  <span class="text-xs text-gray-500 font-normal block sm:inline"
                    >(6位以上英、數字，必須包含大小寫)</span
                  >
                </label>
                <input
                  id="password"
                  v-model="registerForm.password"
                  :class="[
                    'w-full border-2 px-3 py-2 sm:px-4 text-sm sm:text-base',
                    registerErrors.password ? 'border-red-500' : 'border-black',
                  ]"
                  type="password"
                  placeholder="請輸入密碼(6位以上英、數字，必須包含大小寫)"
                  @input="registerErrors.password = ''"
                />
                <span v-if="registerErrors.password" class="text-red-500 text-sm">
                  {{ registerErrors.password }}
                </span>
              </div>
            </div>
            <div class="formInput flex flex-row gap-2">
              <div class="flex flex-col gap-1.5 sm:gap-2 flex-1">
                <label for="confirmPassword" class="text-sm sm:text-base">確認密碼</label>
                <input
                  id="confirmPassword"
                  v-model="registerForm.confirmPassword"
                  :class="[
                    'w-full border-2 px-3 py-2 sm:px-4 text-sm sm:text-base',
                    registerErrors.confirmPassword ? 'border-red-500' : 'border-black',
                  ]"
                  type="password"
                  placeholder="請輸入同樣的密碼"
                  @input="registerErrors.confirmPassword = ''"
                />
                <span v-if="registerErrors.confirmPassword" class="text-red-500 text-sm">
                  {{ registerErrors.confirmPassword }}
                </span>
              </div>
            </div>

            <div v-if="registerErrors.general" class="text-red-500 text-sm text-center">
              {{ registerErrors.general }}
            </div>
            <button
              type="submit"
              class="formSubmit block mx-auto text-center px-5 py-2.5 sm:px-6 sm:py-3 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition-colors font-bold text-sm sm:text-base w-full sm:w-auto"
            >
              註冊
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { auth, db } from '@/firebase/config'
import { useUserStore } from '@/stores/user'
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { createOrUpdateUser, getUserProfile } from '@/api/users'

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

    try {
      // 登入時同步資料，根據 role 設置 vendor_id
      const userRole = userData.role || 'user'
      // 一般用戶和管理員的 vendor_id 必須是 null
      // 廠商角色：如果 Firestore 中有 vendorId 就使用，否則設為 null（後端會處理）
      const vendorId = (userRole === 'user' || userRole === 'admin')
        ? null
        : (userData.vendorId || userData.vendor_id || null)

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
    } catch (syncError) {
      console.error('同步到 Neon 資料庫失敗（但不影響登入）：', syncError)
    }

    try {
      const neonUserData = await getUserProfile(userCredential.user.uid)
      if (neonUserData) {
        applyUserProfileToStore({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          nickname: neonUserData.nickname || userData.nickname || '',
          avatar: neonUserData.avatar || userData.avatar || '',
          bio: neonUserData.bio || userData.bio || '',
          spiritAnimal: neonUserData.spirit_animal || userData.spiritAnimal || '',
          role: neonUserData.role || 'user',
          vendorId: neonUserData.vendor_id || null,
        })
      } else {
        applyUserProfileToStore({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          ...userData,
          role: userData.role || 'user',
        })
      }
    } catch (loadError) {
      console.error('從 Neon 載入用戶資料失敗，使用 Firestore 資料：', loadError)
      applyUserProfileToStore({
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        ...userData,
        role: userData.role || 'user',
      })
    }

    userStore.login()
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

    // 驗證 email 格式的正則表達式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    // 清理 nickname（去除空格）
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

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      registerForm.value.email,
      registerForm.value.password,
    )

    const userData = {
      realName: registerForm.value.realName.trim(),
      nickname: registerForm.value.nickname.trim(),
      email: registerForm.value.email,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userCredential.user.uid}`,
      bio: null,
      spiritAnimal: null,
      role: registerForm.value.role || 'user',
      createdAt: new Date(),
    }
    await setDoc(doc(db, 'users', userCredential.user.uid), userData)

    try {
      const finalRole = registerForm.value.role || 'user'
      const vendorId = finalRole === 'vendor' ? null : null

      console.log('準備同步用戶資料到 Neon 資料庫：', {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        nickname: userData.nickname,
        role: finalRole
      })

      const result = await createOrUpdateUser({
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

      console.log('用戶資料已成功同步到 Neon 資料庫：', result)

      // 標記用戶為最近註冊，避免 onAuthStateChanged 立即查詢導致 404
      userStore.markAsRecentlyRegistered(userCredential.user.uid)
    } catch (syncError) {
      console.error('同步到 Neon 資料庫失敗：', syncError)
      console.error('錯誤詳情：', {
        message: syncError.message,
        stack: syncError.stack,
        response: syncError.response?.data
      })

      // 顯示錯誤訊息給用戶
      const errorMessage = syncError.response?.data?.error || syncError.response?.data?.details || syncError.message || '未知錯誤'
      registerErrors.value.general = '註冊成功，但資料同步到資料庫失敗：' + errorMessage

      // 不阻止註冊流程，但讓用戶知道需要重新登入以同步資料
    }

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
  } catch (error) {
    console.error('註冊失敗：', error.code, error.message)

    // 重置所有錯誤訊息
    registerErrors.value = {
      realName: '',
      nickname: '',
      email: '',
      password: '',
      confirmPassword: '',
      general: '',
    }

    // 根據錯誤類型顯示對應的錯誤訊息
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
    alert('重置密碼郵件已發送至信箱：' + loginForm.value.email + '\n請檢查您的郵箱並點擊重置連結')
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
