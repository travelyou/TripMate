// src/stores/checkout.js
import { reactive } from 'vue'
import axios from 'axios'
import { API_BASE_URL } from '@/api/config'

// 你現有的 API（購物車與行程）
import { fetchItinerariesByIds } from '@/api/itineraries'
import { fetchCartItems, addCartItem, updateCartItemPersons, removeCartItem } from '@/api/cart'

function toDateRange(it) {
  const s = it?.start_date ? String(it.start_date).slice(0, 10) : ''
  const e = it?.end_date ? String(it.end_date).slice(0, 10) : ''
  if (s && e) return `${s} ~ ${e}`
  return s || e || ''
}

export const checkoutStore = reactive({
  // =========================
  // Cart（後端為準）
  // =========================
  cartItems: [], // 後端 cart/items：[{ itineraryId, persons }]
  tourGroups: [], // 給 ShoppingCartPage 用的整合資料
  selectedCartTourId: null,

  isCartLoading: false,
  cartError: '',

  // debounce 同步 persons 用
  _personsSyncTimers: new Map(), // key: itineraryId, value: timeoutId

  // =========================
  // Checkout（後端為準）
  // =========================
  contact: { name: '', phone: '', email: '', note: '' },
  emergencyContact: { name: '', phone: '' },
  agree: false,

  // 注意：付款方式不要再靠「前端記憶」當真相
  // 這裡保留只是為了 UI 選項用（真正顯示以 Step5 後端 latestPayment 為準）
  paymentMethod: '',

  // 建單後（後端回來的 id 才是唯一真相）
  lastOrderId: null,
  orderDetail: null, // GET /orders/:id 回來的資料：{ order, itinerary, latestPayment }

  // =========================
  // 相容層（避免你現有 Step3/Step4 爆炸）
  // =========================
  // 你的 Step3 目前用 checkoutStore.selectedTour
  // 我把它改成「永遠從 cartSelectedTour 取」，不再讓前端自己存一份假資料。
  get selectedTour() {
    return this.cartSelectedTour
  },

  get cartSelectedTour() {
    return this.tourGroups.find((t) => t.id === this.selectedCartTourId) || null
  },

  get cartTotalPrice() {
    const t = this.cartSelectedTour
    return t ? Number(t.price || 0) * Number(t.persons || 1) : 0
  },

  // =========================
  // Cart actions
  // =========================
  _scheduleSyncPersons(itineraryId, persons) {
    const old = this._personsSyncTimers.get(itineraryId)
    if (old) clearTimeout(old)

    const timer = setTimeout(async () => {
      try {
        await updateCartItemPersons({ itineraryId, persons })
        // 同步 raw cartItems（避免之後合併資料不一致）
        const c = this.cartItems.find((x) => Number(x.itineraryId) === Number(itineraryId))
        if (c) c.persons = persons
      } catch (e) {
        console.error('[syncPersons] failed:', e)
        this.cartError = e?.message || '更新人數失敗'
        // 失敗就以 DB 為準重抓，避免 UI/DB 不一致
        await this.loadCartFromDb()
      } finally {
        this._personsSyncTimers.delete(itineraryId)
      }
    }, 600)

    this._personsSyncTimers.set(itineraryId, timer)
  },

  async flushPersonsSync() {
    const entries = Array.from(this._personsSyncTimers.entries())
    this._personsSyncTimers.clear()

    for (const [itineraryId] of entries) {
      const t = this.tourGroups.find((x) => x.id === itineraryId)
      if (!t) continue
      const persons = Number(t.persons ?? 1)
      await updateCartItemPersons({ itineraryId, persons })
    }
  },

  async loadCartFromDb() {
    try {
      this.isCartLoading = true
      this.cartError = ''

      // 1) cart/items
      const cartItems = await fetchCartItems()
      this.cartItems = Array.isArray(cartItems) ? cartItems : []

      const ids = this.cartItems.map((x) => Number(x.itineraryId)).filter(Number.isInteger)
      if (!ids.length) {
        this.tourGroups = []
        this.selectedCartTourId = null
        return
      }

      // 2) itineraries
      const items = await fetchItinerariesByIds(ids)

      // 3) 合併 persons
      const personsMap = new Map(
        this.cartItems
          .map((c) => [Number(c.itineraryId), Number(c.persons ?? 1)])
          .filter(([id]) => Number.isInteger(id)),
      )

      // 4) 映射成 UI shape
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

  increasePersons(id) {
    const t = this.tourGroups.find((x) => x.id === id)
    if (!t) return
    const next = Number(t.persons ?? 1) + 1
    t.persons = next
    this._scheduleSyncPersons(id, next)
  },

  decreasePersons(id) {
    const t = this.tourGroups.find((x) => x.id === id)
    if (!t) return
    const current = Number(t.persons ?? 1)
    if (current <= 1) return
    const next = current - 1
    t.persons = next
    this._scheduleSyncPersons(id, next)
  },

  async removeTour(id) {
    // 先更新 UI
    const wasSelected = this.selectedCartTourId === id
    this.tourGroups = this.tourGroups.filter((t) => t.id !== id)
    if (wasSelected) this.selectedCartTourId = this.tourGroups[0]?.id ?? null

    try {
      await removeCartItem(id)
      this.cartItems = this.cartItems.filter((c) => Number(c.itineraryId) !== Number(id))
    } catch (e) {
      console.error('[removeTour] failed:', e)
      this.cartError = e?.message || '移除購物車項目失敗'
      await this.loadCartFromDb()
    }
  },

  selectCartTourId(id) {
    this.selectedCartTourId = id
  },

  // =========================
  // Checkout actions（後端為準）
  // =========================
  resetCheckout() {
    this.contact = { name: '', phone: '', email: '', note: '' }
    this.emergencyContact = { name: '', phone: '' }
    this.agree = false
    this.paymentMethod = ''

    this.lastOrderId = null
    this.orderDetail = null
  },

  /**
   * Step3 建單：POST /orders/from-cart
   * - itineraryId 用「你在 cart 選的那筆」
   * - contact / emergencyContact 送後端存檔
   */
  async createOrderFromSelectedCart() {
    const tour = this.cartSelectedTour
    if (!tour?.id) throw new Error('找不到要結帳的行程（selectedCartTourId）')

    // 避免最後一秒還有 persons debounce 沒送出去
    await this.flushPersonsSync()

    const payload = {
      itineraryId: tour.id,
      contact: this.contact,
      emergencyContact: this.emergencyContact,
      // paymentMethod 先不要當真相，這裡不強制送；你也可以照舊送 mock
      // paymentMethod: this.paymentMethod || 'mock',
    }

    const { data } = await axios.post(`${API_BASE_URL}/orders/from-cart`, payload)
    if (!data?.ok) throw new Error(data?.message || '建立訂單失敗')

    this.lastOrderId = data.orderId
    // 建完單後，後端會把 cart item 刪掉（你們一次只結帳一個）
    await this.loadCartFromDb()

    return data.orderId
  },

  /**
   * Step4 / Step5：GET /orders/:id
   * - 讓金額、行程、付款方式、付款狀態都以後端為準
   */
  async fetchOrderDetail(orderId) {
    const id = Number(orderId || this.lastOrderId)
    if (!Number.isInteger(id) || id <= 0) throw new Error('orderId 無效')

    const { data } = await axios.get(`${API_BASE_URL}/orders/${id}`)
    if (!data?.ok) throw new Error(data?.message || '讀取訂單失敗')

    this.lastOrderId = id
    this.orderDetail = data
    return data
  },

  async mockPay(paymentId) {
    const { data } = await axios.get(`${API_BASE_URL}/payments/mock-pay`, { params: { paymentId } })
    if (!data?.ok) throw new Error(data?.message || '付款失敗')
    return data
  },

  /**
   * Step4 建立付款：POST /payments/create
   * - 回傳 paymentUrl（LINE Pay 要導轉）
   */
  async createPayment({ orderId, paymentMethod }) {
    const id = Number(orderId || this.lastOrderId)
    if (!Number.isInteger(id) || id <= 0) throw new Error('orderId 無效')
    if (!paymentMethod) throw new Error('paymentMethod 必填')

    const { data } = await axios.post(`${API_BASE_URL}/payments/create`, {
      orderId: id,
      paymentMethod,
    })
    if (!data?.ok) throw new Error(data?.message || '建立付款失敗')

    // UI 記一下（但 Step5 顯示仍以後端 latestPayment 為準）
    this.paymentMethod = paymentMethod
    return data // { paymentId, paymentUrl, ... }
  },
})
