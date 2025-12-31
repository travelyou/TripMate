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
    <div class="flex flex-none lg:flex-[2] items-end lg:items-center justify-center p-0 sm:p-3 md:p-4 pb-0 overflow-hidden order-1 lg:order-none -mt-2 sm:mt-0">
      <img
        src="@/assets/pic/loginPage-removebg.png"
        alt="loginPage"
        class="w-[240px] sm:w-[420px] md:w-[560px] lg:w-[900px] xl:w-[1000px] max-w-full object-contain transform -translate-y-0 sm:-translate-y-10 lg:-translate-y-20 max-h-[40vh] sm:max-h-[50vh] lg:max-h-full"
      />
    </div>

    <div class="flex flex-none lg:flex-[3] items-center justify-center sm:p-0 md:p-0 lg:p-0 order-2 lg:order-none min-h-0 lg:-mt-2 sm:mt-0 lg:pt-8">
      <div class="w-full max-w-lg flex flex-col items-center justify-center px-4 sm:px-0">
        <div class="w-full flex items-center justify-center gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6">
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
                  <span class="text-xs text-gray-500 font-normal block sm:inline">(6位以上英、數字，必須包含大小寫)</span>
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
                <label for="realName" class="text-sm sm:text-base">真實姓名</label>
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
                <label for="nickname" class="text-sm sm:text-base">暱稱</label>
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
                  <span class="text-xs text-gray-500 font-normal block sm:inline">(6位以上英、數字，必須包含大小寫)</span>
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
import { doc, setDoc } from 'firebase/firestore'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

//切換 login / register
const activeTab = ref('login')

//登入：填寫帳號密碼
const loginForm = ref({
  email: '',
  password: '',
})

//註冊：填寫帳號密碼
const registerForm = ref({
  realName: '',
  nickname: '',
  email: '',
  password: '',
  confirmPassword: '',
})

//登入：送出資料
const userStore = useUserStore()
const router = useRouter()
const handleLogin = async () => {
  //送出後出錯則欄位清空
  loginErrors.value = {
    email: '',
    password: '',
    general: '',
  }
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      loginForm.value.email,
      loginForm.value.password,
    )
    console.log('登入成功：', userCredential.user)
    userStore.login()
    router.push('/')
  } catch (error) {
    console.error('登入失敗：', error.message)

    //各種錯誤訊息顯示
    //general 是假如網路連線、firebase、帳號被停用、其他未預期錯誤
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
      loginErrors.value.email = '該電子信箱不存在或是輸入錯誤'
    } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      loginErrors.value.password = '密碼輸入錯誤'
    } else {
      loginErrors.value.general = '登入失敗：' + error.message
    }
  }
}
//登入錯誤訊息通知
const loginErrors = ref({
  email: '',
  password: '',
  general: '',
})

//註冊：送出資料
const handleRegister = async () => {
  try {
    // 1. 檢查必填欄位
    if (!registerForm.value.realName) {
      registerErrors.value.realName = '請填寫真實姓名'
      return
    }
    if (!registerForm.value.nickname) {
      registerErrors.value.nickname = '請填暱稱'
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

    // 2. 檢查 Email 格式（必須包含@）
    if (!registerForm.value.email.includes('@')) {
      registerErrors.value.email = '電子信箱必須包含@'
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(registerForm.value.email)) {
      registerErrors.value.email = '請填寫有效的電子信箱格式'
      return
    }

    // 3. 檢查密碼長度
    if (registerForm.value.password.length < 6) {
      registerErrors.value.password = '密碼長度至少需要 6 個字元'
      return
    }

    // 4. 檢查密碼格式（必須包含大小寫字母和數字）
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

    // 5. 檢查密碼是否一致
    if (registerForm.value.password !== registerForm.value.confirmPassword) {
      registerErrors.value.password = '密碼不一致，請重新確認'
      return
    }

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      registerForm.value.email,
      registerForm.value.password,
    )

    // 儲存使用者額外資料到 Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      realName: registerForm.value.realName,
      nickname: registerForm.value.nickname,
      email: registerForm.value.email,
      createdAt: new Date(),
    })

    console.log('註冊成功：', userCredential.user)
    userStore.login()
    router.push('/')
  } catch (error) {
    console.log('註冊失敗', error.message)
    // 不同狀況的註冊失敗
    if (error.code === 'auth/email-already-in-use') {
      registerErrors.value.email = '此電子信箱已被註冊使用'
    } else if (error.code === 'auth/weak-password') {
      registerErrors.value.password = '密碼強度不夠'
    } else {
      registerErrors.value.general = '註冊失敗：' + error.message
    }
  }
}
//忘記密碼
const handleForgotPassword = async () => {
  try {
    if (!loginForm.value.email) {
      loginErrors.value.email = '請輸入註冊時的電子郵件'
      return
    }
    await sendPasswordResetEmail(auth, loginForm.value.email)
    alert('重置密碼郵件已發送至信箱：' + loginForm.value.email + '\n請檢查您的郵箱並點擊重置連結')
  } catch (error) {
    console.log('發送失敗：' + error.message)
    loginErrors.value.email = '發送失敗：' + error.message
  }
}

//註冊發生錯誤
const registerErrors = ref({
  realName: '',
  nickname: '',
  email: '',
  password: '',
  confirmPassword: '',
  general: '',
})
</script>
