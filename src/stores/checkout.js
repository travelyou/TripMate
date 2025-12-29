import { reactive } from 'vue'

export const checkoutStore = reactive({
  // 購物車資料
  tourGroups: [
    {
      id: 1,
      title: '台北 101 觀景台 + 信義區美食之旅',
      date: '2025年1月15日',
      duration: '4小時',
      price: 1800,
      persons: 1,
      description: '登上台北最高建築，俯瞰城市美景，品嚐在地特色美食',
      image:
        'https://readdy.ai/api/search-image?query=taipei%20101%20observatory%20deck%20with%20panoramic%20city%20view%2C%20modern%20skyscraper%20interior%20with%20floor%20to%20ceiling%20windows%2C%20tourists%20enjoying%20the%20scenic%20vista%2C%20clean%20white%20background%20with%20soft%20lighting&width=300&height=300&seq=cart1&orientation=squarish',
    },
    {
      id: 2,
      title: '九份老街 + 十分瀑布一日遊',
      date: '2025年1月20日',
      duration: '8小時',
      price: 1400,
      persons: 1,
      description: '探索山城風情，體驗傳統文化，欣賞壯麗瀑布景觀',
      image:
        'https://readdy.ai/api/search-image?query=jiufen%20old%20street%20with%20traditional%20red%20lanterns%20and%20mountain%20scenery%2C%20charming%20taiwanese%20village%20architecture%2C%20tourists%20walking%20through%20narrow%20alleys%2C%20clean%20white%20background%20with%20warm%20ambient%20lighting&width=300&height=300&seq=cart2&orientation=squarish',
    },
  ],

  // 在購物車中選到的項目 ID（用於右側結算資訊）
  selectedCartTourId: 1,

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

  // 購物車中目前選的行程（getter）
  get cartSelectedTour() {
    return this.tourGroups.find((t) => t.id === this.selectedCartTourId)
  },

  // 購物車目前選中項目的小計
  get cartTotalPrice() {
    return this.cartSelectedTour ? this.cartSelectedTour.price * this.cartSelectedTour.persons : 0
  },

  // 注意：原本的 totalPrice 是針對送到 checkout 流程的 selectedTour
  //之後金額必須在後端計算，避免被竄改
  get totalPrice() {
    return this.selectedTour ? this.selectedTour.price * this.selectedTour.persons : 0
  },

  agree: false,
  paymentMethod: '',
  mobileProvider: '',
  // 已完成訂單與最後一筆訂單
  completedOrders: [],
  lastOrder: null,

  // 購物車操作方法
  increasePersons(id) {
    const t = this.tourGroups.find((x) => x.id === id)
    if (t) t.persons++
  },
  decreasePersons(id) {
    const t = this.tourGroups.find((x) => x.id === id)
    if (t && t.persons > 1) t.persons--
  },
  removeTour(id) {
    this.tourGroups = this.tourGroups.filter((t) => t.id !== id)
    if (this.tourGroups.length > 0) {
      this.selectedCartTourId = this.tourGroups[0].id
    } else {
      this.selectedCartTourId = null
    }
  },
  selectCartTourId(id) {
    this.selectedCartTourId = id
  },

  // 儲存目前 checkout 為已完成訂單並重設 checkout 狀態
  completeOrder() {
    const order = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      tour: this.selectedTour ? { ...this.selectedTour } : null,
      contact: { ...this.contact },
      emergencyContact: { ...this.emergencyContact },
      paymentMethod: this.paymentMethod,
      mobileProvider: this.mobileProvider,
      totalPrice: this.totalPrice,
    }

    this.completedOrders.push(order)
    this.lastOrder = order

    // 重設 checkoutStore 為預設值
    this.selectedTour = null
    this.contact = { name: '', phone: '', email: '', note: '' }
    this.emergencyContact = { name: '', phone: '' }
    this.agree = false
    this.paymentMethod = ''
    this.mobileProvider = ''

    // 選擇性：可將已下單的項目從購物車中移除（目前不啟用）
    // if (order.tour) this.removeTour(order.tour.id)
  },
})

//應該存到後端的資料:金額的計算、個人資料、訂單建立完成的資料
//待完成:金流、加密通訊
