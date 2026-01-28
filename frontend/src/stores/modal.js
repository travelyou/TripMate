import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useModalStore = defineStore('modal', () => {
  const activeModal = ref(null)
  const modalProps = ref({})

  const openModal = (name, props = {}) => {
    activeModal.value = name
    modalProps.value = props
  }

  const closeModal = () => {
    activeModal.value = null
    modalProps.value = {}
  }

  return {
    activeModal,
    modalProps,
    openModal,
    closeModal,
  }
})
