<script setup>
import { ref, reactive, watch } from 'vue'
import { X, Pencil, Loader2, Eye, EyeOff, Trash2 } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { showConfirm } from '@/utils/alert'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true,
  },
  user: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['close'])

const userStore = useUserStore()

// 狀態管理
const isPasswordVerified = ref(false)
const password = ref('')
const verifyingPassword = ref(false)
const passwordError = ref('')

// 編輯狀態
const editingFields = reactive({
  email: false,
  password: false,
  realName: false,
})

// 表單資料
const formData = reactive({
  email: '',
  password: '',
  newPassword: '',
  confirmPassword: '',
  realName: '',
})

// 顯示/隱藏密碼
const showPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

// 儲存狀態
const saving = reactive({
  email: false,
  password: false,
  realName: false,
})

// 初始化表單資料
watch(
  () => [props.isOpen, props.user],
  ([isOpen, user]) => {
    if (isOpen && user) {
      formData.email = user.email || ''
      formData.realName = user.realName || user.name || ''
      // 重置狀態
      isPasswordVerified.value = false
      password.value = ''
      passwordError.value = ''
      editingFields.email = false
      editingFields.password = false
      editingFields.realName = false
    }
  },
  { immediate: true }
)

// 驗證密碼
const verifyPassword = async () => {
  if (!password.value.trim()) {
    passwordError.value = '請輸入密碼'
    return
  }

  verifyingPassword.value = true
  passwordError.value = ''

  try {
    // 使用 Firebase 驗證密碼（會重新登入，但這是驗證密碼的唯一方法）
    const { signInWithEmailAndPassword } = await import('firebase/auth')
    const { auth } = await import('@/firebase/config')

    // 驗證密碼（這會重新登入）
    await signInWithEmailAndPassword(auth, props.user.email, password.value)

    // 驗證成功後，如果之前有用戶登入，保持當前登入狀態即可
    // Firebase 會自動更新 currentUser
    isPasswordVerified.value = true
    password.value = ''
  } catch (error) {
    console.error('密碼驗證失敗:', error)
    passwordError.value = '密碼錯誤，請重新輸入'
  } finally {
    verifyingPassword.value = false
  }
}

// 開始編輯欄位
const startEdit = (field) => {
  editingFields[field] = true
  if (field === 'password') {
    formData.newPassword = ''
    formData.confirmPassword = ''
  }
}

// 取消編輯
const cancelEdit = (field) => {
  editingFields[field] = false
  if (field === 'email') {
    formData.email = props.user.email || ''
  } else if (field === 'password') {
    formData.newPassword = ''
    formData.confirmPassword = ''
  } else if (field === 'realName') {
    formData.realName = props.user.realName || props.user.name || ''
  }
}

// 儲存欄位
const saveField = async (field) => {
  if (field === 'email') {
    if (!formData.email.trim()) {
      alert('請輸入信箱')
      return
    }
    saving.email = true
    try {
      const { updateUserProfile } = await import('@/api/users')
      await updateUserProfile(props.user.uid, { email: formData.email })
      userStore.updateProfile({ email: formData.email })
      editingFields.email = false
      alert('信箱更新成功')
    } catch (error) {
      console.error('更新信箱失敗:', error)
      alert('更新失敗，請稍後再試')
    } finally {
      saving.email = false
    }
  } else if (field === 'password') {
    if (!formData.newPassword.trim()) {
      alert('請輸入新密碼')
      return
    }
    if (formData.newPassword !== formData.confirmPassword) {
      alert('兩次輸入的密碼不一致')
      return
    }
    if (formData.newPassword.length < 6) {
      alert('密碼長度至少需要6個字元')
      return
    }
    saving.password = true
    try {
      const { updatePassword } = await import('firebase/auth')
      const { auth } = await import('@/firebase/config')
      const user = auth.currentUser
      if (user) {
        await updatePassword(user, formData.newPassword)
        formData.newPassword = ''
        formData.confirmPassword = ''
        editingFields.password = false
        alert('密碼更新成功')
      }
    } catch (error) {
      console.error('更新密碼失敗:', error)
      alert('更新失敗，請稍後再試')
    } finally {
      saving.password = false
    }
  } else if (field === 'realName') {
    saving.realName = true
    try {
      const { updateUserProfile } = await import('@/api/users')
      await updateUserProfile(props.user.uid, { realName: formData.realName })
      userStore.updateProfile({ realName: formData.realName })
      editingFields.realName = false
      alert('真實姓名更新成功')
    } catch (error) {
      console.error('更新真實姓名失敗:', error)
      alert('更新失敗，請稍後再試')
    } finally {
      saving.realName = false
    }
  }
}

// 刪除帳號
const handleDeleteAccount = async () => {
  const confirmed = await showConfirm('確定要刪除帳號嗎？此操作無法復原！')
  if (!confirmed) return

  const passwordConfirm = prompt('請再次輸入密碼以確認刪除：')
  if (!passwordConfirm) return

  try {
    // 驗證密碼
    const { signInWithEmailAndPassword } = await import('firebase/auth')
    const { auth } = await import('@/firebase/config')
    await signInWithEmailAndPassword(auth, props.user.email, passwordConfirm)

    // 呼叫刪除帳號 API
    const { deleteUserAccount } = await import('@/api/users')
    await deleteUserAccount(props.user.uid)

    // 登出並跳轉
    userStore.logout()
    alert('帳號已刪除')
    emit('close')
    window.location.href = '/'
  } catch (error) {
    console.error('刪除帳號失敗:', error)
    alert('刪除失敗，請確認密碼正確')
  }
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <div
      class="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in-up flex flex-col mx-4"
    >
      <!-- 密碼驗證頁面 -->
      <div v-if="!isPasswordVerified" class="p-6">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold text-secondary-900">驗證身份</h2>
          <button
            class="p-2 hover:bg-secondary-50 rounded-full transition"
            @click="emit('close')"
          >
            <X class="w-5 h-5 text-secondary-500" />
          </button>
        </div>
        <div class="space-y-4">
          <p class="text-sm text-secondary-600">為了安全起見，請輸入您的密碼以繼續</p>
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">密碼</label>
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                class="w-full px-4 py-2 pr-12 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="請輸入密碼"
                @keyup.enter="verifyPassword"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-500 hover:text-secondary-700"
                @click="showPassword = !showPassword"
              >
                <Eye v-if="!showPassword" class="w-5 h-5" />
                <EyeOff v-else class="w-5 h-5" />
              </button>
            </div>
            <p v-if="passwordError" class="mt-2 text-sm text-red-600">{{ passwordError }}</p>
          </div>
          <div class="flex justify-end gap-3">
            <button
              class="px-4 py-2 text-secondary-600 font-medium hover:underline"
              @click="emit('close')"
            >
              取消
            </button>
            <button
              :disabled="verifyingPassword || !password.trim()"
              class="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              @click="verifyPassword"
            >
              <Loader2 v-if="verifyingPassword" class="w-4 h-4 animate-spin" />
              <span>{{ verifyingPassword ? '驗證中...' : '確認' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 設定頁面 -->
      <div v-else class="flex flex-col h-full">
        <div class="p-6 border-b border-secondary-100 flex justify-between items-center shrink-0">
          <h2 class="text-xl font-bold text-secondary-900">帳號設定</h2>
          <button
            class="p-2 hover:bg-secondary-50 rounded-full transition"
            @click="emit('close')"
          >
            <X class="w-5 h-5 text-secondary-500" />
          </button>
        </div>

        <div class="p-6 space-y-6 overflow-y-auto flex-1">
          <!-- 信箱 -->
          <div class="border-b border-secondary-100 pb-6">
            <div class="flex items-center justify-between mb-3">
              <label class="block text-sm font-medium text-secondary-700">信箱</label>
              <button
                v-if="!editingFields.email"
                class="p-1.5 hover:bg-secondary-50 rounded-lg transition text-secondary-600 hover:text-primary-600"
                @click="startEdit('email')"
              >
                <Pencil class="w-4 h-4" />
              </button>
            </div>
            <div v-if="!editingFields.email" class="text-base text-secondary-900">
              {{ formData.email || '未設定' }}
            </div>
            <div v-else class="space-y-3">
              <input
                v-model="formData.email"
                type="email"
                class="w-full px-4 py-2 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="請輸入信箱"
              />
              <div class="flex gap-2">
                <button
                  class="px-4 py-2 text-secondary-600 font-medium hover:underline"
                  @click="cancelEdit('email')"
                >
                  取消
                </button>
                <button
                  :disabled="saving.email"
                  class="px-4 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  @click="saveField('email')"
                >
                  <Loader2 v-if="saving.email" class="w-4 h-4 animate-spin" />
                  <span>儲存</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 密碼 -->
          <div class="border-b border-secondary-100 pb-6">
            <div class="flex items-center justify-between mb-3">
              <label class="block text-sm font-medium text-secondary-700">密碼</label>
              <button
                v-if="!editingFields.password"
                class="p-1.5 hover:bg-secondary-50 rounded-lg transition text-secondary-600 hover:text-primary-600"
                @click="startEdit('password')"
              >
                <Pencil class="w-4 h-4" />
              </button>
            </div>
            <div v-if="!editingFields.password" class="text-base text-secondary-900">
              ••••••••
            </div>
            <div v-else class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">新密碼</label>
                <div class="relative">
                  <input
                    v-model="formData.newPassword"
                    :type="showNewPassword ? 'text' : 'password'"
                    class="w-full px-4 py-2 pr-12 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="請輸入新密碼"
                  />
                  <button
                    type="button"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-500 hover:text-secondary-700"
                    @click="showNewPassword = !showNewPassword"
                  >
                    <Eye v-if="!showNewPassword" class="w-5 h-5" />
                    <EyeOff v-else class="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">確認新密碼</label>
                <div class="relative">
                  <input
                    v-model="formData.confirmPassword"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    class="w-full px-4 py-2 pr-12 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="請再次輸入新密碼"
                  />
                  <button
                    type="button"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-500 hover:text-secondary-700"
                    @click="showConfirmPassword = !showConfirmPassword"
                  >
                    <Eye v-if="!showConfirmPassword" class="w-5 h-5" />
                    <EyeOff v-else class="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div class="flex gap-2">
                <button
                  class="px-4 py-2 text-secondary-600 font-medium hover:underline"
                  @click="cancelEdit('password')"
                >
                  取消
                </button>
                <button
                  :disabled="saving.password"
                  class="px-4 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  @click="saveField('password')"
                >
                  <Loader2 v-if="saving.password" class="w-4 h-4 animate-spin" />
                  <span>儲存</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 真實姓名 -->
          <div class="border-b border-secondary-100 pb-6">
            <div class="flex items-center justify-between mb-3">
              <label class="block text-sm font-medium text-secondary-700">真實姓名</label>
              <button
                v-if="!editingFields.realName"
                class="p-1.5 hover:bg-secondary-50 rounded-lg transition text-secondary-600 hover:text-primary-600"
                @click="startEdit('realName')"
              >
                <Pencil class="w-4 h-4" />
              </button>
            </div>
            <div v-if="!editingFields.realName" class="text-base text-secondary-900">
              {{ formData.realName || '未設定' }}
            </div>
            <div v-else class="space-y-3">
              <input
                v-model="formData.realName"
                type="text"
                class="w-full px-4 py-2 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="請輸入真實姓名"
              />
              <div class="flex gap-2">
                <button
                  class="px-4 py-2 text-secondary-600 font-medium hover:underline"
                  @click="cancelEdit('realName')"
                >
                  取消
                </button>
                <button
                  :disabled="saving.realName"
                  class="px-4 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  @click="saveField('realName')"
                >
                  <Loader2 v-if="saving.realName" class="w-4 h-4 animate-spin" />
                  <span>儲存</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 刪除帳號 -->
          <div class="pt-4">
            <div class="bg-red-50 border border-red-200 rounded-xl p-4">
              <div class="flex items-start justify-between mb-3">
                <div>
                  <h3 class="text-base font-bold text-red-900 mb-1">刪除帳號</h3>
                  <p class="text-sm text-red-700">刪除帳號後，所有資料將永久刪除且無法復原</p>
                </div>
              </div>
              <button
                class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition"
                @click="handleDeleteAccount"
              >
                <Trash2 class="w-4 h-4" />
                刪除帳號
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in-up {
  animation: fadeInUp 0.3s ease-out;
}
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

