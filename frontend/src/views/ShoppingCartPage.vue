<script setup>
import MainButton from '@/components/checkout/MainButton.vue'
import SubButton from '@/components/checkout/SubButton.vue'
import { checkoutStore } from '@/stores/checkout'
import { computed, onMounted, ref } from 'vue'
import { ShoppingCart as ShoppingCartIcon } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(() => {
  checkoutStore.loadCartFromDb()
  checkoutStore.markCartAsViewed()
})

const tourGroups = computed(() => checkoutStore.tourGroups)

const selectedTourId = computed({
  get: () => checkoutStore.selectedCartTourId,
  set: (val) => (checkoutStore.selectedCartTourId = Number(val)),
})

const selectedTour = computed(() => checkoutStore.cartSelectedTour)

const totalPrice = computed(() => checkoutStore.cartTotalPrice)

const isCartLoading = computed(() => checkoutStore.isCartLoading)
const showCartList = computed(() => checkoutStore.tourGroups.length > 0)
const isCartEmpty = computed(() => !isCartLoading.value && checkoutStore.tourGroups.length === 0)
const showLoading = computed(() => isCartLoading.value && checkoutStore.tourGroups.length === 0)

const showTestButtons = ref(false)
const toggleTestButtons = () => {
  showTestButtons.value = !showTestButtons.value
}

function increasePersons(tour) {
  checkoutStore.increasePersons(tour.id)
}
function decreasePersons(tour) {
  checkoutStore.decreasePersons(tour.id)
}

function removeTour(id) {
  checkoutStore.removeTour(id)
}

const goCheckout = async () => {
  if (!checkoutStore.tourGroups.length) {
    await checkoutStore.loadCartFromDb()
  }

  const selected = checkoutStore.cartSelectedTour
  if (!selected) {
    alert('請先選擇一個要結帳的行程！')
    return
  }

  router.push(`/checkout/step1?itineraryId=${selected.id}`)
}

function goToFeatured() {
  router.push('/featured-itinerary')
}
</script>

<template>
  <section class="max-w-5xl mx-auto mt-5 p-5 md:mr-0 xl:mr-20 rounded-2xl text-secondary-900">
    <div class="ml-8 mb-5 flex items-center gap-1">
      <button
        type="button"
        class="inline-flex items-center justify-center p-2 rounded-full text-primary"
        aria-label="Toggle test buttons"
        @click="toggleTestButtons"
      >
        <ShoppingCartIcon class="w-5 h-5" />
      </button>
      <h1 class="text-3xl font-bold">購物車</h1>
    </div>
    <div v-show="showTestButtons" class="flex flex-wrap gap-3">
      <button
        type="button"
        class="bg-primary text-white px-5 py-2 rounded-xl"
        @click="checkoutStore.addToCart(1)"
      >
        加入itinerary #1 到購物車
      </button>
      <button
        type="button"
        class="bg-primary text-white px-5 py-2 rounded-xl"
        @click="checkoutStore.addToCart(2)"
      >
        加入itinerary #2 到購物車
      </button>
    </div>

    <div v-show="showLoading" class="rounded-2xl">
      <div class="flex flex-col gap-5 lg:flex-row">
        <div class="rounded-2xl flex-1">
          <ul class="grid gap-5">
            <li
              v-for="n in 3"
              :key="n"
              class="p-5 border border-secondary-100 rounded-2xl bg-white shadow-sm"
            >
              <div class="animate-pulse flex flex-col justify-between gap-10 sm:flex-row">
                <div class="flex flex-col gap-5 sm:flex-row">
                  <div class="h-4 w-4 rounded-full bg-gray-200 mt-1"></div>
                  <div class="w-32 h-24 bg-gray-200 rounded-lg"></div>
                  <div class="flex flex-col justify-between flex-1">
                    <div class="space-y-2">
                      <div class="h-4 w-48 bg-gray-200 rounded"></div>
                      <div class="h-3 w-72 bg-gray-200 rounded"></div>
                    </div>
                    <div class="flex gap-5 mt-5">
                      <div class="h-3 w-20 bg-gray-200 rounded"></div>
                      <div class="h-3 w-16 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>

                <div class="flex justify-between sm:flex-col">
                  <div class="h-4 w-16 bg-gray-200 rounded"></div>
                  <div class="flex gap-1">
                    <div class="h-5 w-5 bg-gray-200 rounded-md"></div>
                    <div class="h-5 w-5 bg-gray-200 rounded-md"></div>
                    <div class="h-5 w-5 bg-gray-200 rounded-md"></div>
                  </div>
                  <div class="h-4 w-12 bg-gray-200 rounded"></div>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <div class="min-w-48 md:max-w-240 lg:min-w-64">
          <div
            class="p-5 bg-white rounded-2xl flex flex-col justify-between ring-1 ring-secondary-100 shadow-sm animate-pulse"
          >
            <div>
              <div class="h-4 w-28 bg-gray-200 rounded mb-3"></div>
              <div class="h-3 w-40 bg-gray-200 rounded mb-5"></div>
            </div>
            <div>
              <div class="space-y-3 mb-6">
                <div class="flex justify-between">
                  <div class="h-3 w-10 bg-gray-200 rounded"></div>
                  <div class="h-3 w-16 bg-gray-200 rounded"></div>
                </div>
                <div class="flex justify-between">
                  <div class="h-3 w-10 bg-gray-200 rounded"></div>
                  <div class="h-3 w-16 bg-gray-200 rounded"></div>
                </div>
              </div>
              <div class="border-t border-gray-200 pt-3 pb-3">
                <div class="flex justify-between">
                  <div class="h-3 w-10 bg-gray-200 rounded"></div>
                  <div class="h-3 w-16 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
            <div class="flex flex-col gap-5">
              <div class="h-10 w-full bg-gray-200 rounded-xl"></div>
              <div class="h-10 w-full bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="flex flex-col gap-5 lg:flex-row">
      <div v-show="showCartList" class="rounded-2xl">
        <ul class="grid gap-5">
          <li
            v-for="tour in tourGroups"
            :key="tour.id"
            :class="[
              'relative p-5 border border-secondary-100 rounded-2xl hover:shadow-lg shadow-sm lg:min-w-[450px] transition-colors',
              selectedTourId === tour.id ? 'bg-primary-50 ring-2 ring-primary-300' : 'bg-white',
            ]"
          >
            <span
              v-if="selectedTourId === tour.id"
              class="absolute -top-1 -left-1 text-sm font-bold bg-primary-600 text-white px-4 py-1 rounded-lg shadow-sm"
            >
              已選擇
            </span>
            <div class="flex flex-col justify-between gap-10 sm:flex-row">
              <div class="flex flex-col gap-5 sm:flex-row">
                <input
                  :id="`tour-${tour.id}`"
                  v-model="selectedTourId"
                  type="radio"
                  name="tour"
                  :value="tour.id"
                  class="sr-only peer"
                />
                <label
                  :for="`tour-${tour.id}`"
                  class="flex flex-col gap-5 sm:flex-row cursor-pointer flex-1"
                >
                <img
                  v-if="tour.image"
                  :src="tour.image"
                  alt="旅遊圖片"
                  class="w-32 h-24 rounded-lg overflow-hidden flex-shrink-0 self-center sm:self-right"
                />

                <div class="flex flex-col justify-between">
                  <div>
                    <h1 class="font-bold">{{ tour.title }}</h1>
                  </div>
                  <div class="flex gap-5 mt-5">
                    <p class="text-sm text-gray-500">{{ tour.date }}</p>
                    <p class="text-sm text-gray-500">{{ tour.duration }}</p>
                  </div>
                </div>
              </label>
              </div>

              <!-- 價錢/人數增減/刪除 -->
              <div class="flex justify-between sm:flex-col">
                <p class="text-right">NT.{{ tour.price }}</p>
                <div class="flex gap-1 text-sm">
                  <button
                    class="bg-white h-5 w-5 leading-4 border border-secondary-300 rounded-md cursor-pointer text-secondary-700 hover:bg-secondary-50"
                    @click="decreasePersons(tour)"
                  >
                    -
                  </button>
                  <p
                    class="bg-white h-5 w-5 leading-[18px] text-center border border-secondary-200 rounded-md text-secondary-700"
                  >
                    {{ tour.persons }}
                  </p>
                  <button
                    class="bg-white h-5 w-5 leading-4 border border-secondary-200 rounded-md cursor-pointer text-secondary-700 hover:bg-secondary-50"
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

      <div v-show="showCartList" class="min-w-48 md:max-w-240 lg:min-w-64">
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
            <MainButton @click="goCheckout"> 前往結帳 </MainButton>
            <SubButton @click="goToFeatured">繼續購物</SubButton>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
