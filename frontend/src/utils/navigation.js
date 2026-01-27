/**
 * Get the route location object for a vendor profile
 * @param {Object} user - The user object (from userStore.currentUser)
 * @returns {Object} Route location object
 */
export const getVendorProfileRoute = (user) => {
  if (!user) return { name: 'home' } // Fallback

  // 優先使用 vendorId，否則使用 uid
  // 這樣也能兼容純 User 查看自己 Profile 的情況 (雖然 ProfilePage 用法可能不同，但 VendorProfile 肯定是用 id)
  const targetId = user.vendorId || user.vendor_id || user.uid || user.id

  if (targetId) {
    return { name: 'VendorProfile', params: { id: targetId } }
  }

  return { name: 'VendorDashboard' }
}
