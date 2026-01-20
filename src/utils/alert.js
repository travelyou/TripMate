import Swal from 'sweetalert2'

const baseOptions = {
  confirmButtonText: '確定',
  confirmButtonColor: '#07344c',
}

export const showAlert = (text, options = {}) => {
  return Swal.fire({
    text,
    icon: 'info',
    ...baseOptions,
    ...options,
    didOpen: () => {
      console.log('swal opened')
    },
  })
}

export const showSuccess = (text, options = {}) => {
  return Swal.fire({
    text,
    icon: 'success',
    ...baseOptions,
    ...options,
  })
}

export const showError = (text, options = {}) => {
  return Swal.fire({
    text,
    icon: 'error',
    ...baseOptions,
    ...options,
  })
}

export const showConfirm = async (text, options = {}) => {
  const html = text?.replace(/\n/g, '<br />')
  const result = await Swal.fire({
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: '確定',
    cancelButtonText: '取消',
    confirmButtonColor: '#07344c',
    cancelButtonColor: '#94a3b8',
    reverseButtons: true,
    html,
    ...options,
  })
  return result.isConfirmed
}
