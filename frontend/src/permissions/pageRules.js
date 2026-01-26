/**
 * 檢查頁面互動權限
 * @param {string} actionType - 'EDIT', 'MESSAGE', 'FOLLOW'
 * @param {object} currentUser - 當前登入者
 * @param {string|number} targetUserId - 目標頁面的擁有者 ID (可能是 User UID 或 Vendor ID)
 * @returns {boolean}
 */
export function checkPageAction(actionType, currentUser, targetUserId) {
  if (!currentUser) return false

  // 統一轉成字串比較，避免 123 != "123"
  const currentId = String(currentUser.uid || currentUser.id)
  const targetId = String(targetUserId)

  let isOwner = currentId === targetId

  // 如果尚未匹配，且當前用戶是廠商，嘗試比對 vendorId
  if (!isOwner && currentUser.vendorId) {
    isOwner = String(currentUser.vendorId) === targetId
  }

  switch (actionType) {
    case 'EDIT':
      return isOwner
    case 'MESSAGE': // 私訊 / 聊聊
      return !isOwner // 不能自己傳給自己
    case 'FOLLOW': // 追蹤 / 加好友
      return !isOwner
    default:
      return false
  }
}
