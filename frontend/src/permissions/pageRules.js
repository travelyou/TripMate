export function checkPageAction(actionType, currentUser, targetUserId) {
  if (!currentUser) return false

  const currentId = String(currentUser.uid || currentUser.id)
  const targetId = String(targetUserId)

  let isOwner = currentId === targetId

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
