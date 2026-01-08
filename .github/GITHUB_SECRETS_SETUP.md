# GitHub Secrets 設置指南

這份文檔說明如何在 GitHub 上設置環境變數（Secrets），讓你的 CI/CD 流程和部署可以使用這些環境變數。

## 📋 目錄

1. [什麼是 GitHub Secrets](#什麼是-github-secrets)
2. [如何設置 Secrets](#如何設置-secrets)
3. [前端需要的 Secrets](#前端需要的-secrets)
4. [後端需要的 Secrets](#後端需要的-secrets)
5. [使用 Secrets 在 GitHub Actions](#使用-secrets-在-github-actions)
6. [使用 Secrets 在部署平台](#使用-secrets-在部署平台)

---

## 什麼是 GitHub Secrets

GitHub Secrets 是一個安全的環境變數儲存系統，可以讓你在 GitHub Actions、部署流程中使用敏感資訊（如 API Keys、資料庫密碼等），而不需要將這些資訊直接寫在程式碼中。

**優點：**
- 🔒 安全：只有有權限的人才能查看和編輯
- 🔐 加密：GitHub 會加密儲存所有 Secrets
- 🚫 隱藏：在 GitHub Actions 的日誌中會自動隱藏，不會洩漏

---

## 如何設置 Secrets

### 方法 1：在 GitHub 網頁上設置（推薦）

1. **進入你的 Repository**
   - 前往你的 GitHub Repository 頁面

2. **打開 Settings**
   - 點擊 Repository 頂部的 **Settings** 標籤

3. **進入 Secrets and variables**
   - 在左側選單中找到 **Secrets and variables**
   - 點擊 **Actions** 子選單

4. **添加新的 Secret**
   - 點擊 **New repository secret** 按鈕
   - 輸入 **Name**（名稱，必須完全匹配下面清單中的名稱）
   - 輸入 **Secret**（值，這是你要隱藏的資訊）
   - 點擊 **Add secret**

5. **重複步驟 4**
   - 為每個需要的環境變數重複上述步驟

### 方法 2：使用 GitHub CLI（進階）

如果你使用 GitHub CLI，也可以用命令列設置：

```bash
gh secret set SECRET_NAME --body "secret-value"
```

---

## 前端需要的 Secrets

在 GitHub Repository → Settings → Secrets and variables → Actions 中，添加以下 Secrets：

### Firebase 配置（必須）

| Secret 名稱 | 說明 | 範例 |
|------------|------|------|
| `VITE_FIREBASE_API_KEY` | Firebase API Key | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | `your-project-id` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket | `your-project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID | `123456789012` |
| `VITE_FIREBASE_APP_ID` | Firebase App ID | `1:123456789012:web:...` |
| `VITE_FIREBASE_MEASUREMENT_ID` | Firebase Measurement ID（可選） | `G-XXXXXXXXXX` |

### Supabase 配置（必須）

| Secret 名稱 | 說明 | 範例 |
|------------|------|------|
| `VITE_SUPABASE_URL` | Supabase Project URL | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### API 配置（可選，有預設值）

| Secret 名稱 | 說明 | 預設值 |
|------------|------|--------|
| `VITE_API_BASE_URL` | 後端 API 基礎 URL | `http://localhost:3000/api` |

---

## 後端需要的 Secrets

### 資料庫配置（必須）

| Secret 名稱 | 說明 | 範例 |
|------------|------|------|
| `DB_HOST` | 資料庫主機地址 | `db.xxxxx.supabase.co` |
| `DB_PORT` | 資料庫端口 | `5432` 或 `6543`（Pooling） |
| `DB_NAME` | 資料庫名稱 | `postgres` |
| `DB_USER` | 資料庫用戶名 | `postgres` |
| `DB_PASSWORD` | 資料庫密碼 | `your-secure-password` |

### 伺服器配置（可選，有預設值）

| Secret 名稱 | 說明 | 預設值 |
|------------|------|--------|
| `BACKEND_PORT` | 後端服務器端口 | `3000` |
| `USE_POOLING` | 是否使用 Connection Pooling | `false` |

---

## 使用 Secrets 在 GitHub Actions

Secrets 在 GitHub Actions 中通過 `${{ secrets.SECRET_NAME }}` 語法使用。

範例請參考 `.github/workflows/ci.yml` 檔案。

### 前端使用範例

```yaml
- name: Build frontend
  env:
    VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
  run: npm run build
```

### 後端使用範例

```yaml
- name: Test backend
  env:
    DB_HOST: ${{ secrets.DB_HOST }}
    DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
  run: npm test
```

---

## 使用 Secrets 在部署平台

除了 GitHub Actions，你也可以在其他部署平台上使用類似的環境變數設置：

### Vercel

1. 進入 Vercel Dashboard → 你的專案 → Settings → Environment Variables
2. 添加環境變數（名稱和值）
3. 選擇要應用的環境（Production、Preview、Development）
4. 重新部署

### Netlify

1. 進入 Netlify Dashboard → 你的網站 → Site settings → Environment variables
2. 添加環境變數
3. 重新部署

### Railway / Render / 其他平台

每個平台都有自己的環境變數設置頁面，通常在專案設置或環境設置中可以找到。

---

## 🔍 檢查 Secrets 是否設置成功

### 在 GitHub Actions 中檢查

1. 前往 Actions 標籤
2. 查看最新的 Workflow run
3. 點擊進入查看詳細日誌
4. 檢查環境變數是否正確載入（注意：值會被隱藏顯示為 `***`）

### 驗證 Secrets 是否遺漏

如果缺少必要的 Secrets，GitHub Actions 會顯示錯誤或在日誌中提示。你也可以在 Workflow 中添加檢查步驟：

```yaml
- name: Check required secrets
  run: |
    if [ -z "${{ secrets.VITE_FIREBASE_API_KEY }}" ]; then
      echo "錯誤: VITE_FIREBASE_API_KEY 未設置"
      exit 1
    fi
```

---

## 📝 注意事項

1. **Secret 名稱必須完全匹配**
   - 在 GitHub Actions 中使用 `${{ secrets.SECRET_NAME }}` 時，名稱必須與你在 GitHub 設置的完全一致（區分大小寫）

2. **不要將 Secrets 提交到程式碼**
   - `.env` 檔案應該在 `.gitignore` 中
   - 永遠不要在程式碼中硬編碼 Secrets

3. **定期更新 Secrets**
   - 如果 API Key 或密碼變更，記得更新 GitHub Secrets

4. **限制訪問權限**
   - 只有必要的協作者才能查看和編輯 Secrets

5. **使用不同的 Secrets 用於不同環境**
   - 可以考慮使用 GitHub Environments 來區分開發、測試、生產環境的 Secrets

---

## 🆘 常見問題

### Q: 我忘記了某個 Secret 的值怎麼辦？
A: 如果是在 GitHub 上，你無法直接查看已設置的 Secret 值（這是為了安全）。你需要重新設置它。

### Q: 可以批量導入 Secrets 嗎？
A: GitHub 網頁介面不支援批量導入，需要一個一個設置。但你可以使用 GitHub CLI 或 API 來批量設置。

### Q: Secrets 會自動同步到所有分支嗎？
A: 是的，Repository-level 的 Secrets 會在所有分支和工作流程中可用。

### Q: 前端環境變數為什麼要加 `VITE_` 前綴？
A: 這是 Vite 的要求。只有以 `VITE_` 開頭的環境變數才會在前端打包時被包含進來。

---

## 📚 相關資源

- [GitHub Secrets 官方文檔](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Vite 環境變數文檔](https://vitejs.dev/guide/env-and-mode.html)
- [Node.js dotenv 文檔](https://www.npmjs.com/package/dotenv)

---

**最後更新：** 2024

如果有任何問題，請查看上述文檔或詢問團隊成員。









