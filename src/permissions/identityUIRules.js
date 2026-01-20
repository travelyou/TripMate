import { UI_IDENTITIES } from './identities'

// 定義不同模式下 SideMenu 和 HeaderMenu 應該顯示什麼
// 這裡只定義「邏輯規則」，不包含具體路由路徑 (路由路徑在 AppSidebar/AppHeader 中維護)

export const SIDEBAR_RULES = {
  [UI_IDENTITIES.GENERAL]: {
    showUserProfile: true,
    showVendorProfile: false,
    showFavorites: true
  },
  [UI_IDENTITIES.VENDOR_DASHBOARD]: {
    showUserProfile: false,
    showVendorProfile: true, // 廠商後台模式下，點擊個人檔案是去「廠商檔案」
    showFavorites: false // 廠商後台可能不顯示一般收藏
  }
}

export const HEADER_MENU_RULES = {
  [UI_IDENTITIES.GENERAL]: {
    showUserAccount: true,
    showVendorDashboard: false, // 一般模式 (除非是廠商且切換身分) - 這裡邏輯較複雜，通常由 component 判斷 role 決定是否顯示「切換」入口
    showLogout: true
  },
  [UI_IDENTITIES.VENDOR_DASHBOARD]: {
    showUserAccount: false, // 後台模式不顯示「我的個人帳號」
    showVendorProfile: true,
    showBackToHome: true,
    showLogout: true
  }
}
