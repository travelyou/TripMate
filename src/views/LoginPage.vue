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
        class="w-[240px] sm:w-[420px] md:w-[560px] lg:w-[900px] xl:w-[1000px] max-w-full object-contain transform -translate-y-0 sm:-translate-y-10 lg:-translate-y-20 max-h-[40vh] sm:max-h-[50vh] lg:max-h-full"
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
            >登入</span
          >
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
            >註冊</span
          >
        </div>

        <div class="form-wrapper w-full flex items-center justify-center px-2 sm:px-0">
          <form
            v-if="activeTab === 'login'"
            class="formContainer w-full max-w-lg bg-white rounded-lg shadow-lg p-4 sm:p-5 md:p-6 space-y-3 sm:space-y-4"
            @submit.prevent="handleLogin"
          >
            <div class="formInput flex flex-row gap-2">
              <div class="flex flex-col gap-1.5 sm:gap-2 flex-1">
                <label for="email" class="text-sm sm:text-base">電子信箱</label>
                <input
                  id="email"
                  v-model="loginForm.email"
                  :class="[
                    'w-full border-2 px-3 py-2 sm:px-4 text-sm sm:text-base',
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
                <label for="password" class="text-sm sm:text-base">密碼</label>
                <input
                  id="password"
                  v-model="loginForm.password"
                  :class="[
                    'w-full border-2 px-3 py-2 sm:px-4 text-sm sm:text-base',
                    loginErrors.password ? 'border-red-500' : 'border-black',
                  ]"
                  type="password"
                  placeholder="請輸入密碼"
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
                <span v-if="registerErrors.realName" class="text-red-500 text-sm">{{
                  registerErrors.realName
                }}</span>
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
                <span v-if="registerErrors.nickname" class="text-red-500 text-sm">{{
                  registerErrors.nickname
                }}</span>
              </div>
            </div>
            <div class="formInput flex flex-row gap-2">
              <div class="flex flex-col gap-1.5 sm:gap-2 flex-1">
                <label for="email" class="text-sm sm:text-base">電子信箱</label>
                <input
                  id="email"
                  v-model="registerForm.email"
                  :class="[
                    'w-full border-2 px-3 py-2 sm:px-4 text-sm sm:text-base',
                    registerErrors.email ? 'border-red-500' : 'border-black',
                  ]"
                  type="email"
                  placeholder="請輸入電子信箱"
                  @input="registerErrors.email = ''"
                />
                <span v-if="registerErrors.email" class="text-red-500 text-sm">{{
                  registerErrors.email
                }}</span>
              </div>
            </div>
            <div class="formInput flex flex-row gap-2">
              <div class="flex flex-col gap-1.5 sm:gap-2 flex-1">
                <label for="password" class="text-sm sm:text-base">密碼</label>
                <input
                  id="password"
                  v-model="registerForm.password"
                  :class="[
                    'w-full border-2 px-3 py-2 sm:px-4 text-sm sm:text-base',
                    registerErrors.password ? 'border-red-500' : 'border-black',
                  ]"
                  type="password"
                  placeholder="請輸入密碼"
                  @input="registerErrors.password = ''"
                />
                <span v-if="registerErrors.password" class="text-red-500 text-sm">{{
                  registerErrors.password
                }}</span>
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
                <span v-if="registerErrors.confirmPassword" class="text-red-500 text-sm">{{
                  registerErrors.confirmPassword
                }}</span>
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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { supabase } from '@/supabase/config'

const activeTab = ref('login')
const router = useRouter()
const userStore = useUserStore()

// ---------------------------
// 登入邏輯
// ---------------------------
const loginForm = ref({ email: '', password: '' })
const loginErrors = ref({ email: '', password: '', general: '' })

const handleLogin = async () => {
  // 1. 重置錯誤
  loginErrors.value = { email: '', password: '', general: '' }

  // 2. 基本驗證
  if (!loginForm.value.email) return (loginErrors.value.email = '請輸入電子信箱')
  if (!loginForm.value.password) return (loginErrors.value.password = '請輸入密碼')

  try {
    console.log('⏳ 正在嘗試登入...')
    await userStore.login(loginForm.value.email, loginForm.value.password)

    console.log('✅ 登入成功，跳轉首頁')
    router.push('/')
  } catch (error) {
    console.error('❌ 登入失敗：', error.message)
    if (error.message.includes('Invalid login credentials')) {
      loginErrors.value.general = '帳號或密碼錯誤'
    } else {
      loginErrors.value.general = '登入失敗：' + error.message
    }
  }
}

// ---------------------------
// 註冊邏輯
// ---------------------------
const registerForm = ref({
  realName: '',
  nickname: '',
  email: '',
  password: '',
  confirmPassword: '',
})
const registerErrors = ref({
  realName: '',
  nickname: '',
  email: '',
  password: '',
  confirmPassword: '',
  general: '',
})

const handleRegister = async () => {
  // 1. 重置錯誤
  registerErrors.value = {
    realName: '',
    nickname: '',
    email: '',
    password: '',
    confirmPassword: '',
    general: '',
  }

  // 2. 驗證邏輯
  if (!registerForm.value.realName) return (registerErrors.value.realName = '請填寫真實姓名')
  if (!registerForm.value.nickname) return (registerErrors.value.nickname = '請填暱稱')
  if (!registerForm.value.email) return (registerErrors.value.email = '請填寫電子信箱')
  if (!registerForm.value.password) return (registerErrors.value.password = '請填寫密碼')

  if (!registerForm.value.email.includes('@'))
    return (registerErrors.value.email = '電子信箱必須包含@')

  // 密碼長度與複雜度檢查
  if (registerForm.value.password !== registerForm.value.confirmPassword) {
    registerErrors.value.password = '密碼不一致，請重新確認'
    return
  }

  try {
    console.log('⏳ 正在嘗試註冊...')

    await userStore.signup(registerForm.value.email, registerForm.value.password, {
      real_name: registerForm.value.realName,
      nickname: registerForm.value.nickname,
    })

    console.log('✅ 註冊成功')
    alert('註冊成功！請檢查您的信箱以驗證帳號 (如果開啟了信箱驗證)，或直接登入。')

    // 註冊完嘗試自動登入或跳轉
    router.push('/')
  } catch (error) {
    console.error('❌ 註冊失敗：', error.message)
    if (error.message.includes('User already registered')) {
      registerErrors.value.email = '此電子信箱已被註冊使用'
    } else {
      registerErrors.value.general = '註冊失敗：' + error.message
    }
  }
}

// ---------------------------
// 忘記密碼邏輯
// ---------------------------
const handleForgotPassword = async () => {
  if (!loginForm.value.email) {
    loginErrors.value.email = '請輸入註冊時的電子郵件'
    return
  }
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(loginForm.value.email, {
      redirectTo: window.location.origin + '/reset-password',
    })
    if (error) throw error
    alert('重置密碼郵件已發送至：' + loginForm.value.email)
  } catch (error) {
    console.error('發送失敗：', error.message)
    loginErrors.value.general = '發送失敗：' + error.message
  }
}
</script>
