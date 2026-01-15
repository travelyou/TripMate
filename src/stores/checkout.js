import { reactive } from 'vue'
import { fetchItinerariesByIds } from '@/api/itineraries'
import { fetchCartItems, addCartItem, updateCartItemPersons, removeCartItem } from '@/api/cart'

function toDateRange(it) {
  const s = it?.start_date ? String(it.start_date).slice(0, 10) : ''
  const e = it?.end_date ? String(it.end_date).slice(0, 10) : ''
  if (s && e) return `${s} ~ ${e}`
  return s || e || ''
}

export const checkoutStore = reactive({
  // 後端 cart/items 回來的原始資料（[{ itineraryId, persons }]）
  cartItems: [],

  // ShoppingCartPage 使用的資料（[{ id,title,description,image,date,duration,price,persons }])
  tourGroups: [],

  selectedCartTourId: null,
  isCartLoading: false,
  cartError: '',
  // Debounce 同步用
  _personsSyncTimers: new Map(), // key: itineraryId, value: timeoutId
  _personsLastSynced: new Map(), // key: itineraryId, value: lastSyncedPersons（可選）

  // 延遲同步人數（避免每次點擊都打 API）
  _scheduleSyncPersons(itineraryId, persons) {
    // 清掉舊的 timer（代表使用者還在連點）
    const old = this._personsSyncTimers.get(itineraryId)
    if (old) clearTimeout(old)

    const timer = setTimeout(async () => {
      try {
        await updateCartItemPersons({ itineraryId, persons })

        // 同步 cartItems，讓之後 reload/checkout 資料一致
        const c = this.cartItems.find((x) => x.itineraryId === itineraryId)
        if (c) c.persons = persons

        this._personsLastSynced.set(itineraryId, persons)
      } catch (e) {
        console.error('[syncPersons] failed:', e)
        this.cartError = e?.message || '更新人數失敗'

        // 失敗處理（建議：直接以 DB 為準回復）
        // 這樣不會跟後端狀態不一致
        await this.loadCartFromDb()
      } finally {
        this._personsSyncTimers.delete(itineraryId)
      }
    }, 600) // 600ms 可調：越大越省流量、越小越即時

    this._personsSyncTimers.set(itineraryId, timer)
  },

  async flushPersonsSync() {
    // 把所有 timer 立刻清掉並直接送最新值
    const entries = Array.from(this._personsSyncTimers.entries())
    this._personsSyncTimers.clear()

    for (const [itineraryId] of entries) {
      const t = this.tourGroups.find((x) => x.id === itineraryId)
      if (!t) continue
      const persons = Number(t.persons ?? 1)
      await updateCartItemPersons({ itineraryId, persons })
    }
  },

  // 讀取購物車：先抓 cart/items，再用 itinerary ids 去抓 itineraries
  async loadCartFromDb() {
    try {
      this.isCartLoading = true
      this.cartError = ''

      // 1) 先抓「購物車內容」
      const cartItems = await fetchCartItems()
      this.cartItems = Array.isArray(cartItems) ? cartItems : []

      const ids = this.cartItems.map((x) => Number(x.itineraryId)).filter(Number.isInteger)
      if (!ids.length) {
        this.tourGroups = []
        this.selectedCartTourId = null
        return
      }

      // 2) 再抓行程資料
      const items = await fetchItinerariesByIds(ids)

      // 3) 合併 persons
      const personsMap = new Map(
        this.cartItems
          .map((c) => [Number(c.itineraryId), Number(c.persons ?? 1)])
          .filter(([id]) => Number.isInteger(id)),
      )

      // 4) 映射成 ShoppingCartPage 需要的欄位
      this.tourGroups = (items || []).map((it) => ({
        id: it.id,
        title: it.title ?? '',
        description: it.content ?? '',
        image: it.banner_image ?? '',
        date: toDateRange(it),
        duration: '',
        price: Number(it.price ?? 0),
        persons: personsMap.get(it.id) ?? 1,
      }))

      // 預設選第一個
      if (!this.selectedCartTourId && this.tourGroups.length) {
        this.selectedCartTourId = this.tourGroups[0].id
      }

      // 若原本選的已不存在，就改選第一個
      if (
        this.selectedCartTourId &&
        !this.tourGroups.some((t) => t.id === this.selectedCartTourId)
      ) {
        this.selectedCartTourId = this.tourGroups[0]?.id ?? null
      }
    } catch (e) {
      console.error('[loadCartFromDb] failed:', e)
      this.cartError = e?.message || '載入購物車失敗'
      this.tourGroups = []
      this.selectedCartTourId = null
    } finally {
      this.isCartLoading = false
    }
  },

  // 給 ShoppingCartPage 測試按鈕用：加入 itineraryId 到購物車
  async addToCart(itineraryId, persons = 1) {
    try {
      this.cartError = ''
      await addCartItem({ itineraryId, persons })
      await this.loadCartFromDb()
    } catch (e) {
      console.error('[addToCart] failed:', e)
      this.cartError = e?.message || '加入購物車失敗'
    }
  },

  get cartSelectedTour() {
    return this.tourGroups.find((t) => t.id === this.selectedCartTourId)
  },

  get cartTotalPrice() {
    return this.cartSelectedTour ? this.cartSelectedTour.price * this.cartSelectedTour.persons : 0
  },

  // 要送到結帳流程的選中項目（在前往 /checkout/step1 前設定）
  selectedTour: null,

  contact: {
    name: '',
    phone: '',
    email: '',
    note: '',
  },
  emergencyContact: {
    name: '',
    phone: '',
  },

  agree: false,
  paymentMethod: '',
  mobileProvider: '',

  // 已完成訂單與最後一筆訂單
  completedOrders: [],
  lastOrder: null,

  // ---- 購物車操作方法（同步 UI + 延遲同步後端）----

  increasePersons(id) {
    const t = this.tourGroups.find((x) => x.id === id)
    if (!t) return

    const next = Number(t.persons ?? 1) + 1
    t.persons = next

    // 不立刻打 API，改成 debounce 同步
    this._scheduleSyncPersons(id, next)
  },

  decreasePersons(id) {
    const t = this.tourGroups.find((x) => x.id === id)
    if (!t) return

    const current = Number(t.persons ?? 1)
    if (current <= 1) return

    const next = current - 1
    t.persons = next

    // 不立刻打 API，改成 debounce 同步
    this._scheduleSyncPersons(id, next)
  },

  async removeTour(id) {
    // 先更新 UI
    const wasSelected = this.selectedCartTourId === id
    this.tourGroups = this.tourGroups.filter((t) => t.id !== id)

    if (wasSelected) {
      this.selectedCartTourId = this.tourGroups[0]?.id ?? null
    }

    try {
      await removeCartItem(id)
      // 同步 raw cartItems
      this.cartItems = this.cartItems.filter((c) => Number(c.itineraryId) !== id)
    } catch (e) {
      console.error('[removeTour] failed:', e)
      this.cartError = e?.message || '移除購物車項目失敗'
      // 失敗就重抓一次，避免 UI 跟 DB 不一致
      await this.loadCartFromDb()
    }
  },

  selectCartTourId(id) {
    this.selectedCartTourId = id
  },

  // 不再建立前端假訂單：只重設 checkout 狀態
  resetCheckout() {
    this.selectedTour = null
    this.contact = { name: '', phone: '', email: '', note: '' }
    this.emergencyContact = { name: '', phone: '' }
    this.agree = false
    this.paymentMethod = ''
    this.mobileProvider = ''
  },

  /*
  // 保留舊名字做相容（可選）
  completeOrder() {
    this.resetCheckout()
  },
  */
})
