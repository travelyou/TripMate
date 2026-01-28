import { reactive } from 'vue'
import axios from 'axios'
import { API_BASE_URL } from '@/api/config'

import { fetchItinerariesByIds } from '@/api/itinerary'
import { fetchCartItems, addCartItem, updateCartItemPersons, removeCartItem } from '@/api/cart'

function toDateRange(it) {
  const s = it?.start_date ? String(it.start_date).slice(0, 10) : ''
  const e = it?.end_date ? String(it.end_date).slice(0, 10) : ''
  if (s && e) return `${s} ~ ${e}`
  return s || e || ''
}

export const checkoutStore = reactive({
  cartItems: [],
  tourGroups: [],
  selectedCartTourId: null,

  isCartLoading: false,
  cartError: '',
  hasViewedCart: false,

  _personsSyncTimers: new Map(),

  contact: { name: '', phone: '', email: '', note: '' },
  emergencyContact: { name: '', phone: '' },
  agree: false,

  paymentMethod: '',

  lastOrderId: null,
  orderDetail: null,

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

  _scheduleSyncPersons(itineraryId, persons) {
    const PERSONS_SYNC_DEBOUNCE_MS = 600
    const old = this._personsSyncTimers.get(itineraryId)
    if (old) clearTimeout(old)

    const timer = setTimeout(async () => {
      try {
        await updateCartItemPersons({ itineraryId, persons })
        const c = this.cartItems.find((x) => Number(x.itineraryId) === Number(itineraryId))
        if (c) c.persons = persons
      } catch (e) {
        this.cartError = e?.message || '更新人數失敗'
        await this.loadCartFromDb()
      } finally {
        this._personsSyncTimers.delete(itineraryId)
      }
    }, PERSONS_SYNC_DEBOUNCE_MS)

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

      const cartItems = await fetchCartItems()
      this.cartItems = Array.isArray(cartItems) ? cartItems : []

      const ids = this.cartItems.map((x) => Number(x.itineraryId)).filter(Number.isInteger)
      if (!ids.length) {
        this.tourGroups = []
        this.selectedCartTourId = null
        return
      }

      const items = await fetchItinerariesByIds(ids)

      const personsMap = new Map(
        this.cartItems
          .map((c) => [Number(c.itineraryId), Number(c.persons ?? 1)])
          .filter(([id]) => Number.isInteger(id)),
      )

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

      if (!this.selectedCartTourId && this.tourGroups.length) {
        this.selectedCartTourId = this.tourGroups[0].id
      }

      if (
        this.selectedCartTourId &&
        !this.tourGroups.some((t) => t.id === this.selectedCartTourId)
      ) {
        this.selectedCartTourId = this.tourGroups[0]?.id ?? null
      }
    } catch (e) {
      this.cartError = e?.message || '載入購物車失敗'
      this.tourGroups = []
      this.selectedCartTourId = null
    } finally {
      this.isCartLoading = false
    }
  },

  async addToCart(itineraryId, persons = 1, options = {}) {
    try {
      this.cartError = ''
      const numItineraryId = Number(itineraryId)

      const exists = this.cartItems.some(
        (item) => Number(item.itineraryId) === Number(numItineraryId),
      )

      if (!exists) {
        this.cartItems.push({ itineraryId: numItineraryId, persons })

        const existsInTourGroups = this.tourGroups.some((t) => t.id === numItineraryId)
        if (!existsInTourGroups) {
          this.tourGroups.push({
            id: numItineraryId,
            title: '載入中...',
            description: '',
            image: '',
            date: '',
            duration: '',
            price: 0,
            persons: persons,
          })
        }
      }

      this.hasViewedCart = false

      await addCartItem({ itineraryId: numItineraryId, persons })

      if (!options.skipReload) {
        await this.loadCartFromDb()
      }
    } catch (e) {
      this.cartError = e?.message || '加入購物車失敗'
      await this.loadCartFromDb()
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
    const wasSelected = this.selectedCartTourId === id
    this.tourGroups = this.tourGroups.filter((t) => t.id !== id)
    if (wasSelected) this.selectedCartTourId = this.tourGroups[0]?.id ?? null

    try {
      await removeCartItem(id)
      this.cartItems = this.cartItems.filter((c) => Number(c.itineraryId) !== Number(id))
    } catch (e) {
      this.cartError = e?.message || '移除購物車項目失敗'
      await this.loadCartFromDb()
    }
  },

  selectCartTourId(id) {
    this.selectedCartTourId = id
  },

  markCartAsViewed() {
    this.hasViewedCart = true
  },

  resetCheckout() {
    this.contact = { name: '', phone: '', email: '', note: '' }
    this.emergencyContact = { name: '', phone: '' }
    this.agree = false
    this.paymentMethod = ''

    this.lastOrderId = null
    this.orderDetail = null
  },

  async createOrderFromSelectedCart() {
    const tour = this.cartSelectedTour
    if (!tour?.id) throw new Error('找不到要結帳的行程（selectedCartTourId）')

    await this.flushPersonsSync()

    const payload = {
      itineraryId: tour.id,
      contact: this.contact,
      emergencyContact: this.emergencyContact,
    }

    const { data } = await axios.post(`${API_BASE_URL}/orders/from-cart`, payload)
    if (!data?.ok) throw new Error(data?.message || '建立訂單失敗')

    this.lastOrderId = data.orderId
    localStorage.setItem('lastOrderId', data.orderId)
    await this.loadCartFromDb()

    return data.orderId
  },

  async fetchOrderDetail(orderId) {
    const id = Number(orderId || this.lastOrderId)
    if (!Number.isInteger(id) || id <= 0) throw new Error('orderId 無效')

    const { data } = await axios.get(`${API_BASE_URL}/orders/${id}`)
    if (!data?.ok) throw new Error(data?.message || '讀取訂單失敗')

    this.lastOrderId = id
    localStorage.setItem('lastOrderId', id)
    this.orderDetail = data
    return data
  },

  async mockPay(paymentId) {
    const { data } = await axios.get(`${API_BASE_URL}/payments/mock-pay`, { params: { paymentId } })
    if (!data?.ok) throw new Error(data?.message || '付款失敗')
    return data
  },

  async createPayment({ orderId, paymentMethod }) {
    const id = Number(orderId || this.lastOrderId)
    if (!Number.isInteger(id) || id <= 0) throw new Error('orderId 無效')
    if (!paymentMethod) throw new Error('paymentMethod 必填')

    const { data } = await axios.post(`${API_BASE_URL}/payments/create`, {
      orderId: id,
      paymentMethod,
    })
    if (!data?.ok) throw new Error(data?.message || '建立付款失敗')

    this.paymentMethod = paymentMethod
    return data
  },
})
