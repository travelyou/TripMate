<script setup>
import MainButton from '@/components/checkout/MainButton.vue'
import SubButton from '@/components/checkout/SubButton.vue'
import { checkoutStore } from '@/stores/checkout'
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

onMounted(() => {
  if (!checkoutStore.tourGroups.length) {
    checkoutStore.loadCartFromDb()
  }
})

const router = useRouter()

const tourGroups = computed(() => checkoutStore.tourGroups)

const selectedTourId = computed({
  get: () => checkoutStore.selectedCartTourId,
  set: (val) => (checkoutStore.selectedCartTourId = val),
})

// 選擇的項目本身
const selectedTour = computed(() => checkoutStore.cartSelectedTour)

// 結算總金額
const totalPrice = computed(() => checkoutStore.cartTotalPrice)

// 購物車是否為空
const isCartEmpty = computed(() => checkoutStore.tourGroups.length === 0)

// 增加/減少人數
function increasePersons(tour) {
  checkoutStore.increasePersons(tour.id)
}
function decreasePersons(tour) {
  checkoutStore.decreasePersons(tour.id)
}

// 刪除購物車項目
function removeTour(id) {
  checkoutStore.removeTour(id)
}

//前往結帳
function goToCheckout() {
  if (selectedTour.value) {
    checkoutStore.selectedTour = selectedTour.value
    router.push('/checkout/step1')
  } else {
    // 沒有選中項目
    alert('請先選擇一個要結帳的行程！')
  }
}

//去精選行程頁
function goToFeatured() {
  router.push('/featured-itinerary')
}
</script>

<template>
  <section class="max-w-5xl mx-auto mt-5 p-5 md:mr-0 xl:mr-20 rounded-2xl text-secondary-900">
    <h1 class="text-3xl font-bold ml-8 mb-5">購物車</h1>
    <button
      type="button"
      class="bg-primary text-white px-5 py-2 rounded-xl"
      @click="checkoutStore.addToCart(1)"
    >
      加入itinerary #1 到購物車
    </button>
    <button
      class="bg-primary text-white px-5 py-2 rounded-xl"
      @click="checkoutStore.loadCartFromDb()"
    >
      重新載入
    </button>
    <!-- 購物車整個區塊 -->
    <div class="flex flex-col gap-5 lg:flex-row">
      <!-- 購物車列表 -->
      <div v-show="!isCartEmpty" class="rounded-2xl">
        <ul class="grid gap-5">
          <li
            v-for="tour in tourGroups"
            :key="tour.id"
            class="p-5 border border-secondary-100 rounded-2xl bg-white hover:shadow-lg shadow-sm lg:min-w-[450px]"
          >
            <div class="flex flex-col justify-between gap-10 sm:flex-row">
              <!-- radio -->

              <!-- radio/圖/資料 -->
              <div class="flex flex-col gap-5 sm:flex-row">
                <input v-model="selectedTourId" type="radio" name="tour" :value="tour.id" />
                <img
                  v-if="tour.image"
                  :src="tour.image"
                  alt="旅遊圖片"
                  class="w-32 h-24 rounded-lg overflow-hidden flex-shrink-0 self-center sm:self-right"
                />

                <div class="flex flex-col justify-between">
                  <div>
                    <h1 class="font-bold">{{ tour.title }}</h1>
                    <p class="text-sm text-gray-500">{{ tour.description }}</p>
                  </div>
                  <div class="flex gap-5 mt-5">
                    <p class="text-sm text-gray-500">{{ tour.date }}</p>
                    <p class="text-sm text-gray-500">{{ tour.duration }}</p>
                  </div>
                </div>
              </div>

              <!-- 價錢/人數增減/刪除 -->
              <div class="flex justify-between sm:flex-col">
                <p class="text-right">NT.{{ tour.price }}</p>
                <div class="flex gap-1 text-sm">
                  <button
                    class="h-5 w-5 leading-4 border border-secondary-200 rounded-md cursor-pointer text-secondary-700 hover:bg-secondary-50"
                    @click="decreasePersons(tour)"
                  >
                    -
                  </button>
                  <p
                    class="h-5 w-5 leading-[18px] text-center border border-secondary-200 rounded-md text-secondary-700"
                  >
                    {{ tour.persons }}
                  </p>
                  <button
                    class="h-5 w-5 leading-4 border border-secondary-200 rounded-md cursor-pointer text-secondary-700 hover:bg-secondary-50"
                    @click="increasePersons(tour)"
                  >
                    +
                  </button>
                </div>
                <button
                  class="text-accent-600 hover:text-accent-700 cursor-pointer"
                  @click="removeTour(tour.id)"
                >
                  刪除
                </button>
              </div>
            </div>
          </li>
        </ul>

        <div v-if="checkoutStore.isCartLoading">載入中...</div>
        <div v-else-if="checkoutStore.cartError">{{ checkoutStore.cartError }}</div>
      </div>

      <!-- 購物車是空的 -->
      <div v-show="isCartEmpty" class="max-w-5xl mx-auto mt-10 text-center">
        <div class="mb-5">
          <h1 class="text-xl">購物車是空的</h1>
          <p class="text-gray-500">快去挑選心儀的行程吧！</p>
        </div>
        <router-link
          to="/featured-itinerary"
          class="py-2 px-8 text-center bg-primary text-white rounded-xl hover:bg-primary-700 disabled:bg-secondary-400"
        >
          前往精選行程
        </router-link>
      </div>

      <!-- 購物車小結區 -->

      <div v-show="!isCartEmpty" class="min-w-48 md:max-w-240 lg:min-w-64">
        <div
          class="p-5 bg-white rounded-2xl flex flex-col justify-between ring-1 ring-secondary-100 shadow-sm"
        >
          <div>
            <h1>結算資訊</h1>
            <p class="text-gray-400 text-sm mb-5">請選擇要結帳的行程</p>
          </div>
          <div>
            <div class="space-y-3 mb-6">
              <div class="flex justify-between text-gray-700">
                <span>人數</span>
                <span>{{ selectedTour ? selectedTour.persons : 0 }}</span>
              </div>
              <div class="flex justify-between text-gray-700">
                <span>金額 </span>
                <span>NT$ {{ selectedTour ? selectedTour.price : 0 }} </span>
              </div>
            </div>
            <div class="border-t border-gray-300 pt-3 pb-3">
              <div class="flex justify-between text-gray-700">
                <span>小記</span>
                <span>NT$ {{ totalPrice }}</span>
              </div>
            </div>
          </div>
          <!-- 按鈕區 -->
          <div class="flex flex-col gap-5">
            <MainButton @click="goToCheckout"> 前往結帳 </MainButton>
            <SubButton @click="goToFeatured">繼續購物</SubButton>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
