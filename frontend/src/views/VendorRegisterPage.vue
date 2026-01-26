<template>
  <div class="min-h-screen bg-secondary-50 py-8 px-4">
    <div class="max-w-2xl mx-auto">
      <div class="bg-white rounded-xl shadow-lg border-4 border-primary p-6 md:p-8">
        <div class="mb-6">
          <h1 class="text-3xl font-black text-primary mb-2 flex items-center gap-3">
            <StoreIcon class="w-8 h-8" />
            註冊成為廠商
          </h1>
          <p class="text-secondary-600 mb-4">申請成為 TripMate 認證廠商，開始販售精選行程</p>

          <div class="bg-secondary-50 border-2 border-secondary-200 rounded-lg p-4 mb-4">
            <p class="text-sm font-bold text-secondary-700 mb-3">請提供以下資料：</p>
            <ul class="space-y-2 text-sm text-secondary-600 mb-3">
              <li class="flex items-start gap-2">
                <span class="text-primary font-bold">•</span>
                <span>公司/旅行社名稱</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-primary font-bold">•</span>
                <span>聯絡人姓名</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-primary font-bold">•</span>
                <span>聯絡電話</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-primary font-bold">•</span>
                <span>電子信箱</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-primary font-bold">•</span>
                <span>證明文件類型（導遊證或旅遊業者從業證明）</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-primary font-bold">•</span>
                <span>證明文件號碼</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-primary font-bold">•</span>
                <span>備註說明（選填）</span>
              </li>
            </ul>
            <p class="text-sm font-bold text-primary mt-4 pt-3 border-t border-secondary-300">
              傳至：yuntailee0615@gmail.com (由 TripMate 團隊人員進行審核)
            </p>
          </div>
        </div>

        <div class="space-y-6">
          <!-- 申請須知 -->
          <div class="bg-primary-50 border-2 border-primary-200 rounded-lg p-4">
            <h2 class="text-lg font-bold text-primary mb-3">申請須知</h2>
            <ul class="space-y-2 text-sm text-secondary-700">
              <li class="flex items-start gap-2">
                <span class="text-primary font-bold">•</span>
                <span>必須持有<strong>導遊證</strong>或<strong>旅遊業者從業證明</strong></span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-primary font-bold">•</span>
                <span>申請資料將由管理員人工審核</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-primary font-bold">•</span>
                <span>審核通過後即可開始發布精選行程</span>
              </li>
            </ul>
          </div>

          <!-- 返回按鈕 -->
          <div class="flex justify-center pt-4">
            <button
              type="button"
              class="px-8 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-700 transition"
              @click="router.back()"
            >
              返回
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { Store as StoreIcon } from 'lucide-vue-next'

const router = useRouter()
</script>

