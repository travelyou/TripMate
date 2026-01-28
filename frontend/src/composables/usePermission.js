import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRoute } from 'vue-router'
import { checkPageAction } from '@/permissions/pageRules'
import { UI_IDENTITIES } from '@/permissions/identities'

export function usePermission() {
  const userStore = useUserStore()
  const route = useRoute()

  const canEdit = computed(() => {
    const targetId = route.params.uid || route.params.id || userStore.currentUser.uid
    return checkPageAction('EDIT', userStore.currentUser, targetId)
  })

  const currentIdentity = computed(() => {
    if (userStore.isVendor && route.path.startsWith('/vendor/dashboard')) {
      return UI_IDENTITIES.VENDOR_DASHBOARD
    }
    return UI_IDENTITIES.GENERAL
  })

  const isVendorRole = computed(() => userStore.isVendor)

  return {
    canEdit,
    currentIdentity,
    isVendorRole
  }
}
