<template>
  <div
    class="loginRegisterPage min-h-screen bg-[#fffef7] flex flex-col items-center justify-center p-4"
  >
    <div class="flex flex-col items-center gap-3 mb-6">
      <div class="flex items-center gap-4">
        <span
          :class="[
            'text-3xl font-semibold transition-colors duration-200 cursor-pointer',
            activeTab === 'login' ? 'text-orange-600' : 'text-gray-400',
          ]"
          @click="activeTab = 'login'"
        >
          登入
        </span>
        <button
          type="button"
          class="relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          :class="activeTab === 'login' ? 'bg-orange-600' : 'bg-gray-300'"
          @click="activeTab = activeTab === 'login' ? 'register' : 'login'"
        >
          <span
            class="inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300"
            :class="activeTab === 'login' ? 'translate-x-1' : 'translate-x-9'"
          ></span>
        </button>
        <span
          :class="[
            'text-3xl font-semibold transition-colors duration-200 cursor-pointer',
            activeTab === 'register' ? 'text-orange-600' : 'text-gray-400',
          ]"
          @click="activeTab = 'register'"
        >
          註冊
        </span>
      </div>
    </div>
    <div class="form-wrapper w-full max-w-md min-h-[600px] flex itmes-start justify-center">
      <form
        v-if="activeTab === 'login'"
        class="formContainer w-full max-w-md bg-white rounded-lg shadow-lg p-6 space-y-4"
        @submit.prevent="handleLogin"
      >
        <div class="formInput flex flex-row gap-2">
          <div class="flex flex-col gap-2 flex-1">
            <label for="email">電子信箱</label>
            <input
              id="email"
              v-model="loginForm.email"
              class="w-full border-2 border-black px-4 py-2"
              type="email"
              placeholder="請輸入電子信箱"
            />
          </div>
        </div>
        <div class="formInput flex flex-row gap-2">
          <div class="flex flex-col gap-2 flex-1">
            <label for="password">密碼</label>
            <input
              id="password"
              v-model="loginForm.password"
              class="w-full border-2 border-black px-4 py-2"
              type="password"
              placeholder="請輸入密碼"
            />
          </div>
        </div>
        <button
          type="submit"
          class="formSubmit block mx-auto text-center px-6 py-3 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition-colors font-bold"
        >
          登入
        </button>
        <a
          href="#"
          class="block text-center text-sm text-gray-600 hover:text-orange-600 transition-colors cursor-pointer"
          @click.prevent="handleForgotPassword"
          >忘記密碼?</a
        >
      </form>

      <form
        v-if="activeTab === 'register'"
        class="formContainer w-full max-w-md bg-white rounded-lg shadow-lg p-6 space-y-4"
        @submit.prevent="handleRegister"
      >
        <div class="formInput flex flex-row gap-2">
          <div class="flex flex-col gap-2 flex-1">
            <label for="realName">真實姓名</label>
            <input
              id="realName"
              v-model="registerForm.realName"
              class="w-full border-2 border-black px-4 py-2"
              type="text"
              placeholder="請輸入本名(不公開)"
            />
          </div>
        </div>
        <div class="formInput flex flex-row gap-2">
          <div class="flex flex-col gap-2 flex-1">
            <label for="nickname">暱稱</label>
            <input
              id="nickname"
              v-model="registerForm.nickname"
              class="w-full border-2 border-black px-4 py-2"
              type="text"
              placeholder="請輸入使用者暱稱(公開)"
            />
          </div>
        </div>
        <div class="formInput flex flex-row gap-2">
          <div class="flex flex-col gap-2 flex-1">
            <label for="email">電子信箱</label>
            <input
              id="email"
              v-model="registerForm.email"
              class="w-full border-2 border-black px-4 py-2"
              type="email"
              placeholder="請輸入電子信箱"
            />
          </div>
        </div>
        <div class="formInput flex flex-row gap-2">
          <div class="flex flex-col gap-2 flex-1">
            <label for="password">密碼</label>
            <input
              id="password"
              v-model="registerForm.password"
              class="w-full border-2 border-black px-4 py-2"
              type="password"
              placeholder="請輸入密碼"
            />
          </div>
        </div>
        <div class="formInput flex flex-row gap-2">
          <div class="flex flex-col gap-2 flex-1">
            <label for="confirmPassword">確認密碼</label>
            <input
              id="confirmPassword"
              v-model="registerForm.confirmPassword"
              class="w-full border-2 border-black px-4 py-2"
              type="password"
              placeholder="請輸入同樣的密碼"
            />
          </div>
        </div>
        <button
          type="submit"
          class="formSubmit block mx-auto text-center px-6 py-3 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition-colors font-bold"
        >
          註冊
        </button>
      </form>
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
import { useToast } from '@/composables/useToast'

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
const toast = useToast()

const handleLogin = async () => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      loginForm.value.email,
      loginForm.value.password,
    )
    console.log('登入成功：', userCredential.user)
    userStore.login()
    toast.success('登入成功！')
    router.push('/')
  } catch (error) {
    console.error('登入失敗：', error.message)
    toast.error('登入失敗：' + error.message)
  }
}

//註冊：送出資料
const handleRegister = async () => {
  try {
    // 1. 檢查必填欄位
    if (!registerForm.value.realName || !registerForm.value.nickname) {
      toast.warning('請填寫真實姓名和暱稱')
      return
    }

    if (!registerForm.value.email || !registerForm.value.password) {
      toast.warning('請填寫電子信箱和密碼')
      return
    }

    // 2. 檢查 Email 格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(registerForm.value.email)) {
      toast.warning('請輸入有效的電子信箱格式')
      return
    }

    // 3. 檢查密碼長度
    if (registerForm.value.password.length < 6) {
      toast.warning('密碼長度至少需要 6 個字元')
      return
    }

    // 4. 檢查密碼是否一致
    if (registerForm.value.password !== registerForm.value.confirmPassword) {
      toast.warning('密碼不一致，請重新確認')
      return
    }

    // 5. 建立使用者帳號
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      registerForm.value.email,
      registerForm.value.password,
    )

    // 6. 儲存使用者額外資料到 Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      realName: registerForm.value.realName,
      nickname: registerForm.value.nickname,
      email: registerForm.value.email,
      createdAt: new Date(),
    })

    console.log('註冊成功：', userCredential.user)
    userStore.login()
    toast.success('註冊成功！')
    router.push('/')
  } catch (error) {
    console.log('註冊失敗', error.message)
    toast.error('註冊失敗：' + error.message)
  }
}
//忘記密碼
const handleForgotPassword = async () => {
  try {
    if (!loginForm.value.email) {
      toast.warning('請輸入註冊時的電子郵件')
      return
    }
    await sendPasswordResetEmail(auth, loginForm.value.email)
    toast.success('重置密碼郵件已發送至信箱：' + loginForm.value.email + '\n請檢查您的郵箱並點擊重置連結')
  } catch (error) {
    console.log('發送失敗：' + error.message)
    toast.error('發送失敗：' + error.message)
  }
}
</script>
