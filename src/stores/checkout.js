import { reactive } from 'vue'

export const checkoutStore = reactive({
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
  },
})

//應該存到後端的資料:金額的計算、個人資料、訂單建立完成的資料
//待完成:金流、加密通訊
