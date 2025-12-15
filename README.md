# Travel You - 旅行社交平台

一個專為旅行愛好者打造的社交平台，提供找旅伴、行程規劃、討論交流等功能，讓您的旅行更加精彩豐富。

## 主要功能

- 🧳 **找旅伴** - 發布和尋找志同道合的旅行夥伴
- 💬 **討論區** - 分享旅行經驗、提問和互動交流
- 📅 **行程管理** - 創建和管理個人旅行行程
- ⭐ **精選行程** - 瀏覽和收藏精選的旅行行程
- 👤 **個人檔案** - 管理個人資料和旅行記錄
- 💬 **即時聊天** - AI 助手和私人聊天功能
- 🔐 **用戶認證** - 安全的登入和註冊系統（目前支援 Email/Password，Facebook 和 Google 登入開發中）

## 技術棧

- **前端框架**: Vue 3 + Vite
- **狀態管理**: Pinia
- **路由**: Vue Router
- **樣式**: Tailwind CSS
- **後端服務**: Firebase (Authentication, Analytics)
- **圖標**: Lucide Vue Next

## Firebase 社交登入設定

### Google 登入設定

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 選擇您的專案
3. 進入 **Authentication** > **Sign-in method**
4. 啟用 **Google** 登入方式
5. 填入 **支援的電子郵件**（您的專案支援的電子郵件網域）
6. 點擊 **儲存**

### Facebook 登入設定

1. 前往 [Facebook Developers](https://developers.facebook.com/)
2. 建立新的應用程式或選擇現有應用程式
3. 在應用程式設定中，新增 **Facebook 登入** 產品
4. 在設定中填入：
   - **有效的 OAuth 重新導向 URI**: `https://YOUR_PROJECT_ID.firebaseapp.com/__/auth/handler`
   - **網站網域**: 您的網站網域
5. 複製 **應用程式 ID** 和 **應用程式密鑰**
6. 回到 Firebase Console > **Authentication** > **Sign-in method**
7. 啟用 **Facebook** 登入方式
8. 貼上 **應用程式 ID** 和 **應用程式密鑰**
9. 點擊 **儲存**

### 注意事項

- 確保在 Firebase Console 中已啟用對應的登入方式
- Facebook 應用程式需要通過審核才能供一般用戶使用（開發階段可以使用測試用戶）
- 本地開發時，確保 Firebase 專案設定正確的授權網域

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
