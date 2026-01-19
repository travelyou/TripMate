import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRoute } from 'vue-router'
import { checkPageAction } from '@/permissions/pageRules'
import { UI_IDENTITIES } from '@/permissions/identities' // 確保引入正確

export function usePermission() {
  const userStore = useUserStore()
  const route = useRoute()

  // 1. 自動判斷當前頁面互動權限
  // 當你需要判斷 "我可以編輯這個頁面嗎?" 時使用
  const canEdit = computed(() => {
    // route.params.id 為空時 (例如 /profile)，通常預設為自己
    // 但如果有指定 ID，則檢查是否為擁有者
    const targetId = route.params.id || userStore.currentUser.uid
    return checkPageAction('EDIT', userStore.currentUser, targetId)
  })

  // 2. 判斷當前介面模式 (Identity Mode)
  // 如果是廠商且在後台路由 -> VENDOR_DASHBOARD
  // 否則 -> GENERAL (即使是廠商，看一般頁面時也是 GENERAL 模式)
  const currentIdentity = computed(() => {
    if (userStore.isVendor && route.path.startsWith('/vendor/dashboard')) {
      return UI_IDENTITIES.VENDOR_DASHBOARD
    }
    return UI_IDENTITIES.GENERAL
  })

  // 3. 判斷我是不是廠商 (角色判斷)
  const isVendorRole = computed(() => userStore.isVendor)

  return {
    canEdit,
    currentIdentity,
    isVendorRole
  }
}
