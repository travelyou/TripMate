// src/utils/time.js
export const formatTime = (timestamp) => {
  if (!timestamp) return ''

  const now = new Date()
  const time = new Date(timestamp)
  if (Number.isNaN(time.getTime())) return ''
  const diff = Math.floor((now - time) / 1000)

  // 3分鐘內：剛剛
  if (diff < 180) return '剛剛'

  // 超過3分鐘：顯示完整日期時間 YYYY/MM/DD HH:mm
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(time)
}

export const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}
