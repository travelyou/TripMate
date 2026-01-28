export const getVendorProfileRoute = (user) => {
  if (!user) return { name: 'home' }

  const targetId = user.vendorId || user.vendor_id || user.uid || user.id

  if (targetId) {
    return { name: 'VendorProfile', params: { id: targetId } }
  }

  return { name: 'VendorDashboard' }
}
