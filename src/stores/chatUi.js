import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useChatUiStore = defineStore('chatUi', () => {
  const isPrivateChatOpen = ref(false)
  const autoOpenUid = ref(null) // 點好友後要自動開聊的對方 uid

  const open = () => {
    isPrivateChatOpen.value = true
  }

  const close = () => {
    isPrivateChatOpen.value = false
    autoOpenUid.value = null
  }

  const openWithUid = (uid) => {
    autoOpenUid.value = uid
    isPrivateChatOpen.value = true
  }

  return { isPrivateChatOpen, autoOpenUid, open, close, openWithUid }
})


