<script setup>
import MainButton from '@/components/checkout/MainButton.vue'
import SubButton from '@/components/checkout/SubButton.vue'
import { checkoutStore } from '@/stores/checkout'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
const router = useRouter()
const userStore = useUserStore()

const tourGroups = ref([
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
])

//選擇的項目ID
const selectedTourId = ref(tourGroups.value[0].id)
//選擇的項目本身
const selectedTour = computed(() => {
  return tourGroups.value.find((tour) => tour.id === selectedTourId.value)
})

//結算總金額
const totalPrice = computed(() => {
  if (!selectedTour.value) return 0
  return selectedTour.value.price * selectedTour.value.persons
})

//購物車是否為空
const isCartEmpty = computed(() => tourGroups.value.length === 0)

//增加/減少人數
function increasePersons(tour) {
  tour.persons++
}
function decreasePersons(tour) {
  if (tour.persons > 1) {
    tour.persons--
  }
}

//刪除購物車項目
function removeTour(id) {
  tourGroups.value = tourGroups.value.filter((tour) => tour.id !== id)
  // 如果還有資料，選第一筆
  if (tourGroups.value.length > 0) {
    selectedTourId.value = tourGroups.value[0].id
  } else {
    // 如果購物車空了
    selectedTourId.value = null
  }
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

//檢測是否登入才能結帳
// function goToCheckout() {
//   if (userStore.isLoggedIn) {
//     if (selectedTour.value) {
//       checkoutStore.selectedTour = selectedTour.value
//       router.push('/checkout/step1')
//     } else {
//       // 沒有選中項目
//       alert('請先選擇一個要結帳的行程！')
//     }
//   } else {
//     // 沒有選中項目
//     alert('請先登入！')
//   }
// }

function goToFeatured() {
  router.push('/featured-itinerary')
}
</script>

<template>
  <section class="max-w-5xl mx-auto mt-10 mr-20">
    <h1 class="text-3xl font-bold">購物車</h1>
    <div class="flex gap-5">
      <div v-show="!isCartEmpty" class="p-5 rounded-md">
        <ul class="grid gap-5 min-w-130">
          <li
            v-for="tour in tourGroups"
            :key="tour.id"
            class="p-5 border border-gray-200 rounded-xl bg-white hover:bg-gray-100"
          >
            <div class="flex justify-between gap-10">
              <div class="flex gap-5">
                <input v-model="selectedTourId" type="radio" name="tour" :value="tour.id" />
                <img
                  v-if="tour.image"
                  :src="tour.image"
                  alt="旅遊圖片"
                  class="w-32 h-24 rounded-lg overflow-hidden flex-shrink-0"
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
              <div class="flex flex-col justify-between">
                <p class="text-right">NT.{{ tour.price }}</p>
                <div class="flex gap-1 text-sm">
                  <button
                    class="h-5 w-5 leading-4 border border-gray-200 rounded-md cursor-pointer"
                    @click="decreasePersons(tour)"
                  >
                    -
                  </button>
                  <p class="h-5 w-5 leading-[18px] text-center border border-gray-200 rounded-md">
                    {{ tour.persons }}
                  </p>
                  <button
                    class="h-5 w-5 leading-4 border border-gray-200 rounded-md cursor-pointer"
                    @click="increasePersons(tour)"
                  >
                    +
                  </button>
                </div>
                <button class="text-red-500 cursor-pointer" @click="removeTour(tour.id)">
                  刪除
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>
      <div v-show="isCartEmpty" class="max-w-5xl mx-auto mt-10 text-center">
        <div class="mb-5">
          <h1 class="text-xl">購物車是空的</h1>
          <p class="text-gray-500">快去挑選心儀的行程吧！</p>
        </div>
        <router-link
          to="/featured-itinerary"
          class="py-2 px-8 text-center bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-600"
        >
          前往精選行程
        </router-link>
      </div>
      <div
        v-show="!isCartEmpty"
        class="p-5 bg-white rounded-md flex flex-col justify-between min-w-60"
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

        <div class="flex flex-col gap-5">
          <MainButton @click="goToCheckout"> 前往結帳 </MainButton>
          <SubButton @click="goToFeatured">繼續購物</SubButton>
        </div>
      </div>
    </div>
  </section>
</template>

<style></style>
