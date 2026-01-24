# TripMate 搜尋篩選功能修正

## 1. 修正搜尋頁面篩選選項無法正常執行

### (1) 問題
- 搜尋欄位下方的細分篩選選項（找旅伴、討論區、精選行程）無法正常執行
- 切換主分類時，子篩選會一直重置，無法保持選中狀態
- 子篩選條件實作不完善，部分篩選選項無實際作用

### (2) 解決方式
- **修正 watch 邏輯**：將 `activeTab` 和 `activeSubFilter` 分開監聽，避免邏輯衝突
- **完善子篩選實作**：
  - **找旅伴篩選**：
    - 招募中：檢查 `status === 'active'` 或標題不含「額滿」、「已成行」
    - 已額滿：檢查 `status === 'full'` 或標題含「額滿」、「已成行」
    - 單人遊：檢查標題、描述、標籤是否含「單人」
    - 團體遊：檢查標題、描述、標籤是否含「團體」
  - **討論區篩選**：
    - 有圖：檢查是否有 `image` 欄位
    - 新貼文：檢查貼文是否在 3 天內發布
    - 找旅伴：檢查標題、描述、標籤是否含「旅伴」或「找人」
    - 找話題：檢查標籤或描述是否含「推薦」、「分享」、「問題」
  - **精選行程篩選**：
    - 旅行社精選：檢查是否有 `vendor_id` 或標籤含「旅行社」、「精選」
    - 導遊推薦：檢查標籤或標題是否含「導遊」或「推薦」
    - 短天數(1-5日)：使用正則表達式解析天數，檢查是否 ≤ 5 天
    - 長天數(6日以上)：使用正則表達式解析天數，檢查是否 ≥ 6 天
    - 亞洲：檢查標題、描述、標籤是否含亞洲國家名稱（日本、韓國、台灣、泰國等）

- **改善資料處理**：
  - 確保 `traveler` 資料包含 `tags`、`status`、`created_at` 等欄位
  - 確保 `discussion` 資料包含 `image`、`banner`、`created_at` 等欄位
  - 確保 `itinerary` 資料包含 `tags`、`vendor_id`、`description` 等欄位
  - 所有資料的 `tags` 欄位統一處理為陣列格式

### (3) 改了哪些檔案
- `frontend/src/views/SearchPage.vue`

---

## 2. 清理非必要的除錯代碼

### (1) 問題
- 前端 `discussions.js` 包含大量除錯用的 `console.log` 和 `console.warn`
- 後端 `travelers.js` 包含測試用的 `console.log`

### (2) 解決方式
- **前端清理**：
  - 移除 `transformPost` 函數中的 8 行除錯代碼（包括貼文處理、avatar 檢查等）
  - 移除 `enrichPostsWithUserInfo` 函數中的 7 行除錯代碼（包括 Firestore 資料獲取日誌）
  - 移除 `loadDiscussions` 函數中的 5 行除錯代碼（包括貼文數量、avatar 檢查等）
  - 保留 `console.error` 用於錯誤處理

- **後端清理**：
  - 移除 GET `/` 路由中的「收到獲取旅伴列表請求」日誌
  - 移除查詢執行相關的 3 行日誌（執行查詢、查詢參數、查詢成功）
  - 移除 GET `/:id` 路由中的 3 行日誌（獲取詳情、找不到旅伴、找到旅伴）
  - 移除 POST `/` 路由中的 3 行日誌（開始標記、缺少必填欄位、主表插入成功、行程天數）
  - 保留 `console.warn` 和 `console.error` 用於錯誤處理和警告

### (3) 改了哪些檔案
- `frontend/src/stores/discussions.js`
- `backend/routes/travelers.js`

---

## 3. 新增使用者名稱搜尋功能

### (1) 功能
- 在搜尋頁面新增「使用者」分類選項
- 支援搜尋使用者名稱、個人簡介、標籤等資訊
- 提供使用者專屬的子篩選選項

### (2) 實作方式
- **新增使用者分類**：
  - 在主分類中加入「使用者」選項
  - 子篩選選項：全部、已開啟配對、有個人簡介、有標籤

- **資料載入**：
  - 使用 `getAllUsers` API 獲取使用者列表（最多 100 位）
  - 在頁面載入時自動抓取使用者資料

- **搜尋邏輯**：
  - 搜尋使用者名稱（nickname / displayName）
  - 搜尋個人簡介（bio / card_bio）
  - 搜尋使用者標籤（tags / card_tags）

- **篩選邏輯**：
  - **已開啟配對**：篩選 `is_matching_enabled === true` 的使用者
  - **有個人簡介**：篩選有填寫 bio 或 card_bio 的使用者
  - **有標籤**：篩選有設定標籤的使用者

- **互動行為**：
  - 點擊使用者卡片：導航到該使用者的個人頁面 `/profile/{uid}`
  - 使用者卡片顯示：頭像、名稱、簡介、標籤
  - 使用紫色主題標示使用者類別

### (3) 改了哪些檔案
- `frontend/src/views/SearchPage.vue`

---

## 修改細節

### SearchPage.vue

#### 修改 1：分離 watch 監聽邏輯
**原本**：
```javascript
watch([activeTab, activeSubFilter], () => {
  currentPage.value = 1
  if (activeTab.value) activeSubFilter.value = '全部'
})
```

**修改後**：
```javascript
watch(activeTab, () => {
  currentPage.value = 1
  activeSubFilter.value = '全部'
})

watch(activeSubFilter, () => {
  currentPage.value = 1
})
```

**原因**：原本的 `if (activeTab.value)` 條件永遠為真，導致每次切換分類時子篩選都會重置。分開監聽後，只有切換主分類時才重置子篩選，切換子篩選時只重置頁碼。

---

#### 修改 2：完善子篩選邏輯
**原本**：
```javascript
scoredItems = scoredItems.filter((item) => {
  const matchTab = activeTab.value === 'all' || item.type === activeTab.value

  let matchSubFilter = true
  if (activeSubFilter.value !== '全部') {
    const filter = activeSubFilter.value
    const tagMatch = item.tags && item.tags.some((t) => t.includes(filter))
    const textMatch = (item.title + item.description).includes(filter)

    if (filter === '有圖') matchSubFilter = !!item.image
    else if (filter === '招募中') matchSubFilter = !item.title.includes('額滿')
    else if (filter === '已額滿') matchSubFilter = item.title.includes('額滿')
    else if (filter === '短天數(1-5日)') matchSubFilter = item.description.includes('日')
    else matchSubFilter = tagMatch || textMatch
  }

  return matchTab && matchSubFilter
})
```

**修改後**：完整的分類篩選邏輯，針對每個分類的特性進行精確匹配（詳見上方「解決方式」）

**原因**：原本的篩選邏輯過於簡單，無法正確處理各種篩選條件。新的邏輯針對不同分類（找旅伴、討論區、精選行程）分別實作專屬的篩選條件，並檢查 `originalData` 中的狀態欄位。

---

#### 修改 3：改善找旅伴資料處理
**原本**：
```javascript
if (travelersStore.recommendations) {
  travelersStore.recommendations.forEach((traveler) => {
    results.push({
      id: traveler.id,
      type: 'traveler',
      title: traveler.title,
      description: traveler.content || `地點：${traveler.location}`,
      avatar: traveler.avatar || traveler.image,
      date: traveler.date || '近期',
      tags: traveler.tag ? [traveler.tag] : [],
      originalData: traveler,
    })
  })
}
```

**修改後**：
```javascript
if (travelersStore.recommendations) {
  travelersStore.recommendations.forEach((traveler) => {
    results.push({
      id: traveler.id,
      type: 'traveler',
      title: traveler.title,
      description: traveler.content || `地點：${traveler.location}`,
      avatar: traveler.avatar || traveler.image,
      date: traveler.date || traveler.created_at || '近期',
      tags: Array.isArray(traveler.tags)
        ? traveler.tags
        : traveler.tag
          ? [traveler.tag]
          : traveler.category
            ? [traveler.category]
            : [],
      originalData: traveler,
    })
  })
}
```

**原因**：
1. 後端回傳的 `tags` 已是陣列格式，需要優先使用
2. 提供多重 fallback 邏輯：`tags` → `tag` → `category`
3. 確保 `date` 欄位有 fallback 到 `created_at`

---

#### 修改 4：改善討論區資料處理
**原本**：
```javascript
if (discussionsStore.discussions) {
  discussionsStore.discussions.forEach((post) => {
    results.push({
      id: post.id,
      type: 'discussion',
      title: post.title,
      description: post.content,
      image: post.image,
      date: post.time || '剛剛',
      tags: post.tags || [],
      originalData: post,
    })
  })
}
```

**修改後**：
```javascript
if (discussionsStore.discussions) {
  discussionsStore.discussions.forEach((post) => {
    results.push({
      id: post.id,
      type: 'discussion',
      title: post.title,
      description: post.content,
      image: post.image || post.banner,
      date: post.time || post.created_at || '剛剛',
      tags: Array.isArray(post.tags) ? post.tags : [],
      originalData: post,
    })
  })
}
```

**原因**：
1. 增加 `banner` 作為圖片的 fallback
2. 增加 `created_at` 作為時間的 fallback
3. 確保 `tags` 是陣列格式

---

#### 修改 5：改善精選行程資料處理
**原本**：
```javascript
if (itineraryStore.itineraries) {
  itineraryStore.itineraries.forEach((plan) => {
    results.push({
      id: plan.id,
      type: 'itinerary',
      title: plan.title,
      description: plan.description || '精彩的旅程規劃',
      image: plan.coverImage || plan.image,
      date: plan.date || '隨時出發',
      tags: plan.tags || [],
      originalData: plan,
    })
  })
}
```

**修改後**：
```javascript
if (itineraryStore.itineraries) {
  itineraryStore.itineraries.forEach((plan) => {
    results.push({
      id: plan.id,
      type: 'itinerary',
      title: plan.title,
      description: plan.description || plan.content || '精彩的旅程規劃',
      image: plan.coverImage || plan.image || plan.banner_image,
      date: plan.date || plan.created_at || '隨時出發',
      tags: Array.isArray(plan.tags) ? plan.tags : [],
      originalData: plan,
    })
  })
}
```

**原因**：
1. 增加 `content` 和 `banner_image` 作為 fallback
2. 增加 `created_at` 作為時間的 fallback
3. 確保 `tags` 是陣列格式

---

## 測試建議

1. **找旅伴篩選測試**：
   - 切換「招募中」應只顯示仍在招募的貼文
   - 切換「已額滿」應只顯示已額滿或已成行的貼文
   - 切換「單人遊」應只顯示包含單人關鍵字的貼文
   - 切換「團體遊」應只顯示包含團體關鍵字的貼文

2. **討論區篩選測試**：
   - 切換「有圖」應只顯示包含圖片的貼文
   - 切換「新貼文」應只顯示 3 天內的貼文
   - 切換「找旅伴」應只顯示尋找旅伴相關的貼文
   - 切換「找話題」應只顯示推薦、分享類的貼文

3. **精選行程篩選測試**：
   - 切換「旅行社精選」應只顯示旅行社發布的行程
   - 切換「導遊推薦」應只顯示導遊推薦的行程
   - 切換「短天數(1-5日)」應只顯示 1-5 天的行程
   - 切換「長天數(6日以上)」應只顯示 6 天以上的行程
   - 切換「亞洲」應只顯示亞洲地區的行程

4. **使用者搜尋測試**：
   - 切換「已開啟配對」應只顯示開啟配對功能的使用者
   - 切換「有個人簡介」應只顯示有填寫簡介的使用者
   - 切換「有標籤」應只顯示有設定標籤的使用者
   - 點擊使用者卡片應導航到該使用者的個人頁面

5. **切換分類測試**：
   - 切換主分類時，子篩選應重置為「全部」
   - 切換子篩選時，應保持在當前主分類，只改變篩選結果
   - 分頁應在切換篩選時重置為第 1 頁

---

#### 修改 6：新增使用者搜尋功能

**新增功能**：
```javascript
// 1. 導入 API
import { getAllUsers } from '@/api/users'

// 2. 新增狀態
const users = ref([])
const loadingUsers = ref(false)

// 3. 新增分類
const tabs = [
  { label: '全部', value: 'all' },
  { label: '找旅伴', value: 'traveler' },
  { label: '討論區', value: 'discussion' },
  { label: '精選行程', value: 'itinerary' },
  { label: '使用者', value: 'user' },  // 新增
]

// 4. 新增子篩選
const subFilterOptions = {
  // ...其他
  user: ['全部', '已開啟配對', '有個人簡介', '有標籤'],  // 新增
}

// 5. 在 allData 中加入使用者資料
if (users.value && users.value.length > 0) {
  users.value.forEach((user) => {
    results.push({
      id: user.uid,
      type: 'user',
      title: user.nickname || user.displayName || '使用者',
      description: user.bio || user.card_bio || `旅行夥伴 · ${user.location || '探索世界'}`,
      avatar: user.avatar || user.photoURL,
      date: '活躍中',
      tags: Array.isArray(user.tags) ? user.tags : Array.isArray(user.card_tags) ? user.card_tags : [],
      originalData: user,
    })
  })
}

// 6. 新增使用者篩選邏輯
else if (activeTab.value === 'user' || item.type === 'user') {
  if (filter === '已開啟配對') {
    matchSubFilter = originalData.is_matching_enabled === true
  } else if (filter === '有個人簡介') {
    matchSubFilter = !!(originalData.bio || originalData.card_bio)
  } else if (filter === '有標籤') {
    const userTags = originalData.tags || originalData.card_tags || []
    matchSubFilter = userTags.length > 0
  }
}

// 7. 更新點擊處理
const handleResultClick = (item) => {
  if (item.type === 'user') {
    router.push(`/profile/${item.id}`)  // 導航到個人頁面
  } else {
    selectedPost.value = item.originalData
    isModalOpen.value = true
  }
}

// 8. 頁面載入時獲取使用者
onMounted(async () => {
  // ...其他邏輯
  loadingUsers.value = true
  try {
    users.value = await getAllUsers({ limit: 100 })
  } catch (error) {
    console.error('載入使用者列表失敗：', error)
  } finally {
    loadingUsers.value = false
  }
})
```

**新增樣式**：
```javascript
const getCategoryLabel = (type) => {
  const map = { 
    traveler: '找旅伴', 
    discussion: '討論區', 
    itinerary: '行程', 
    user: '使用者'  // 新增
  }
  return map[type] || '其他'
}

const getCategoryStyle = (type) => {
  const map = {
    traveler: 'bg-green-50 text-green-600 border-green-200',
    discussion: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    itinerary: 'bg-primary-50 text-primary-700 border-primary-200',
    user: 'bg-purple-50 text-purple-600 border-purple-200',  // 新增
  }
  return map[type] || 'bg-secondary-50 text-secondary-600 border-secondary-200'
}
```

**功能特點**：
1. 支援搜尋使用者名稱、簡介、標籤
2. 三種子篩選選項：已開啟配對、有個人簡介、有標籤
3. 點擊使用者直接導航到個人頁面
4. 使用紫色主題區分使用者類別
5. 自動載入前 100 位使用者

---

## 測試結果

✅ **前端伺服器**：成功啟動在 `http://localhost:5173/`  
✅ **Linter 檢查**：所有修改的檔案均通過檢查，無錯誤  
✅ **代碼清理**：已移除所有非必要的除錯 console 代碼  
✅ **功能邏輯**：篩選邏輯已完善，涵蓋所有子篩選選項  
✅ **新增功能**：成功新增使用者搜尋功能，支援多種篩選條件

### 清理統計
- **前端**：移除 20 行除錯代碼（discussions.js）
- **後端**：移除 10 行除錯代碼（travelers.js）
- **保留**：所有 `console.error` 和必要的 `console.warn` 用於錯誤處理

---

## 4. 改善群組聊天室成員名單錯誤訊息

### (1) 問題
- 群組聊天室成員名單載入失敗時，前端錯誤訊息不夠詳細
- 難以診斷是權限問題、API 錯誤還是資料問題

### (2) 解決方式
- **加強錯誤日誌**：
  - 記錄完整的錯誤回應（包括 status、message）
  - 記錄 API 請求的 roomId
  - 區分 API 失敗和網路錯誤
  
- **改善錯誤訊息**：
  - 顯示後端回傳的具體錯誤訊息
  - 提供更多除錯資訊供開發者使用

### (3) 改了哪些檔案
- `frontend/src/components/chat/PrivateChatWindow.vue`

### (4) 測試資源
- ✅ 建立 `測試群組聊天室成員.md` - 完整測試文檔
- ✅ 建立 `quick_test_group_members.sql` - SQL 快速測試腳本
- ✅ 建立 `如何測試群組成員功能.md` - 測試指南

---

## 5. 修正群組成員 SQL 查詢欄位錯誤

### (1) 問題
- 後端 SQL 查詢使用 `u.name` 欄位，但 `users` 表實際使用 `nickname` 和 `real_name`
- 導致查詢失敗：`ERROR: column u.name does not exist`
- 測試腳本的 `traveler_id` 外鍵約束錯誤

### (2) 解決方式
- **修正後端 SQL 查詢**：
  - 將 `COALESCE(u.name, u.nickname, ...)` 改為 `COALESCE(u.nickname, ...)`
  - 只顯示 `nickname`，不顯示 `real_name`（保護隱私）
  - 影響兩個 API 端點：獲取成員和新增成員
  - 移除 `u.real_name` 欄位，避免洩露真實姓名

- **修正測試腳本**：
  - 所有測試 SQL 改用正確的欄位名稱
  - INSERT 語句改用 `nickname` 和 `real_name`
  - `traveler_id` 改為 `NULL` 避免外鍵錯誤

- **建立快速修復腳本**：
  - `快速修復_群組成員測試.sql` - 一鍵式修復和測試
  - 自動檢查表結構
  - 自動處理外鍵約束
  - 建立完整測試資料並驗證

### (3) 改了哪些檔案
- `backend/routes/travelers.js` - 修正兩處 SQL 查詢
- `quick_test_group_members.sql` - 更新所有欄位名稱
- `測試群組聊天室成員.md` - 更新文檔和範例
- `如何測試群組成員功能.md` - 更新測試指令
- `快速修復_群組成員測試.sql` - 新建立快速修復腳本
- `修復摘要_群組成員問題.md` - 新建立修復摘要文檔

---

## 備註

- 所有修改都已通過 linter 檢查，無錯誤
- 篩選邏輯基於現有資料結構，如後端資料結構變更，可能需要調整
- 建議在測試時確認後端回傳的資料包含必要欄位（`status`、`created_at`、`tags`、`vendor_id` 等）
- 已清理所有非必要的除錯代碼，只保留錯誤處理相關的 console

