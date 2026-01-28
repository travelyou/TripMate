import Swal from 'sweetalert2'

const toHtml = (text) => (text ?? '').toString().replace(/\n/g, '<br />')

const swal = Swal.mixin({
  buttonsStyling: false,

  customClass: {
    popup: 'rounded-2xl shadow-2xl',
    actions: 'flex gap-3 justify-end',
    title: 'text-gray-800',
    htmlContainer: 'text-gray-600 text-sm leading-relaxed',
    confirmButton: 'px-4 py-2 rounded-lg text-white bg-[#07344c] hover:opacity-90',
    cancelButton: 'px-4 py-2 rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200',
  },
})

export const showAlert = (text, options = {}) => {
  return swal.fire({
    html: toHtml(text),
    icon: 'info',
    iconColor: '#2563eb', // info 藍
    confirmButtonText: '確定',
    ...options,
  })
}

export const showSuccess = (text, options = {}) => {
  return swal.fire({
    html: toHtml(text),
    icon: 'success',
    iconColor: '#16a34a', // success 綠
    confirmButtonText: '確定',
    ...options,
  })
}

export const showError = (text, options = {}) => {
  return swal.fire({
    html: toHtml(text),
    icon: 'error',
    iconColor: '#dc2626', // error 紅
    confirmButtonText: '確定',
    ...options,
  })
}

export const showConfirm = async (text, options = {}) => {
  const result = await swal.fire({
    html: toHtml(text),
    icon: 'warning',
    iconColor: '#f59e0b', // warning 黃
    showCancelButton: true,
    confirmButtonText: '確定',
    cancelButtonText: '取消',
    reverseButtons: true,
    ...options,
  })
  return result.isConfirmed
}

export const showPrompt = async (text, options = {}) => {
  const result = await swal.fire({
    html: toHtml(text),
    input: 'text',
    inputValue: options.inputValue ?? '',
    inputPlaceholder: options.inputPlaceholder ?? '',
    showCancelButton: true,
    confirmButtonText: '確定',
    cancelButtonText: '取消',
    reverseButtons: true,
    ...options,
  })
  if (!result.isConfirmed) return null
  return result.value
}