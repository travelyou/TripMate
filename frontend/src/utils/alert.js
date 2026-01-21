import Swal from 'sweetalert2'

// 將純文字的換行轉成 SweetAlert2 可顯示的 <br />
const toHtml = (text) => (text ?? '').toString().replace(/\n/g, '<br />')

// 全站共用樣式（圓角 / 陰影 / 按鈕樣式）
const swal = Swal.mixin({
  // 讓 customClass 的按鈕樣式生效（不被預設樣式覆蓋）
  buttonsStyling: false,

  // 你可以在這裡統一整個彈窗的圓角、陰影、間距
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
