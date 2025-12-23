<script setup>
import { ref, computed } from 'vue'
import {
  MessageSquare as MessageSquareIcon,
  Users as UsersIcon,
  ArrowLeft,
  Image as ImageIcon,
  Smile,
  BarChart2,
  FileVideo,
  X,
  Hash
} from 'lucide-vue-next'

const emit = defineEmits(['close', 'submit-post'])

// --- 狀態管理 ---
const currentStep = ref('menu') // 'menu', 'edit', 'tags', 'preview'

// 發文資料
const postData = ref({
  board: '', // 看板
  title: '', // 標題
  content: '', // 內文
  tags: []   // 標籤
})

const tagSearch = ref('')

// --- 模擬資料 ---
const boards = ['亞洲旅遊', '找旅伴', '窮遊省錢', '美食分享', '住宿推薦', '行程請益']
const suggestedTags = ['#北海道', '#獨旅', '#便宜機票', '#溫泉', '#滑雪']

// --- 功能邏輯 ---

// 切換到編輯模式
const startPosting = (initialBoard = '') => {
  if (initialBoard) {
    postData.value.board = initialBoard
  } else {
    postData.value.board = ''
  }
  currentStep.value = 'edit'
}

const addTag = (tagText) => {
  const cleanTag = tagText.replace(/^#/, '')
  if (!postData.value.tags.includes(cleanTag)) {
    postData.value.tags.push(cleanTag)
  }
  tagSearch.value = ''
}

const removeTag = (index) => {
  postData.value.tags.splice(index, 1)
}

const nextStep = () => {
  if (currentStep.value === 'edit') currentStep.value = 'tags'
  else if (currentStep.value === 'tags') currentStep.value = 'preview'
}

const prevStep = () => {
  if (currentStep.value === 'preview') currentStep.value = 'tags'
  else if (currentStep.value === 'tags') currentStep.value = 'edit'
  else if (currentStep.value === 'edit') currentStep.value = 'menu'
}

const handleFinalSubmit = () => {
  console.log('最終發布資料:', postData.value)
  emit('submit-post', postData.value)
  emit('close')
}

const filteredTags = computed(() => {
  if (!tagSearch.value) return suggestedTags
  return suggestedTags.filter(t => t.includes(tagSearch.value))
})
</script>

<template>
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
    @click.self="$emit('close')"
  >
    <div class="pixel-card w-full max-w-md bg-[#fffef7] relative animate-pop-in flex flex-col max-h-[90vh]">

      <div v-if="currentStep === 'menu'" class="p-6">
        <h3 class="text-xl font-bold text-gray-800 mb-6 text-shadow">
          你想發布什麼？
        </h3>

        <div class="space-y-4">
          <button
            class="w-full flex items-center p-4 bg-orange-300 hover:bg-orange-400 pixel-button border-4 border-black transition-transform active:translate-y-1"
            @click="startPosting()"
          >
            <MessageSquareIcon class="w-6 h-6 text-orange-700 mr-4" />
            <div class="text-left">
              <p class="font-bold text-black">發起討論</p>
              <p class="text-xs text-gray-700">分享經驗或尋求建議</p>
            </div>
          </button>

          <button
            class="w-full flex items-center p-4 bg-green-300 hover:bg-green-400 pixel-button border-4 border-black transition-transform active:translate-y-1"
            @click="startPosting('找旅伴')"
          >
            <UsersIcon class="w-6 h-6 text-green-700 mr-4" />
            <div class="text-left">
              <p class="font-bold text-black">尋找旅伴</p>
              <p class="text-xs text-gray-700">找到志同道合的夥伴</p>
            </div>
          </button>
        </div>

        <button
          class="mt-6 w-full py-2 text-sm text-gray-600 pixel-button bg-gray-200 border-4 border-black font-bold"
          @click="$emit('close')"
        >
          取消
        </button>
      </div>

      <div v-else-if="currentStep === 'edit'" class="flex flex-col h-full">
        <div class="p-4 border-b-2 border-gray-200 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <button class="hover:bg-gray-200 p-1 rounded" @click="prevStep"><ArrowLeft class="w-5 h-5"/></button>
            <span class="font-bold text-lg">發文設定</span>
          </div>
          <select v-model="postData.board" class="bg-gray-100 border-2 border-gray-400 rounded px-2 py-1 text-sm font-bold focus:outline-none focus:border-orange-500">
            <option value="" disabled selected>點此選擇發文看板 ▼</option>
            <option v-for="b in boards" :key="b" :value="b">{{ b }}</option>
          </select>
        </div>

        <div class="p-4 flex-1 overflow-y-auto">
          <div class="flex items-center gap-3 mb-4">
             <div class="w-10 h-10 rounded-full bg-gray-300 border-2 border-black flex items-center justify-center overflow-hidden">
               <UsersIcon class="w-6 h-6 text-gray-600" />
             </div>
             <div>
               <p class="font-bold text-sm">Yuan</p>
               <p class="text-xs text-gray-500">2025年12月16日</p>
             </div>
          </div>

          <input
            v-model="postData.title"
            type="text"
            placeholder="標題 (0/80)"
            class="w-full text-lg font-bold placeholder-gray-400 border-none focus:ring-0 p-0 mb-3 bg-transparent"
            maxlength="80"
          />

          <textarea
            v-model="postData.content"
            placeholder="請輸入你的內文..."
            class="w-full h-40 resize-none border-none focus:ring-0 p-0 text-base bg-transparent placeholder-gray-400"
          ></textarea>
        </div>

        <div class="p-3 border-t-2 border-gray-200 bg-gray-50">
          <div class="flex items-center justify-between mb-3 px-2">
             <div class="flex gap-4 text-gray-500">
               <button class="hover:text-orange-500 transition-colors"><ImageIcon class="w-6 h-6" /></button>
               <button class="hover:text-orange-500 transition-colors"><FileVideo class="w-6 h-6" /></button>
               <button class="hover:text-orange-500 transition-colors"><Smile class="w-6 h-6" /></button>
               <button class="hover:text-orange-500 transition-colors"><BarChart2 class="w-6 h-6" /></button>
             </div>
          </div>

          <div class="flex gap-3">
             <button class="flex-1 py-2 text-sm font-bold text-gray-500 pixel-button bg-white border-4 border-gray-300">存入草稿</button>
             <button class="flex-1 py-2 text-sm font-bold text-white pixel-button bg-orange-500 hover:bg-orange-600 border-4 border-black" @click="nextStep">下一步</button>
          </div>
        </div>
      </div>

      <div v-else-if="currentStep === 'tags'" class="flex flex-col h-full">
        <div class="p-4 border-b-2 border-gray-200 flex items-center gap-2">
          <button class="hover:bg-gray-200 p-1 rounded" @click="prevStep"><ArrowLeft class="w-5 h-5"/></button>
          <span class="font-bold text-lg">新增標籤</span>
        </div>

        <div class="p-6 flex-1 overflow-y-auto">
          <div class="relative mb-6">
            <input
              v-model="tagSearch"
              type="text"
              placeholder="根據文章內容搜尋相關話題..."
              class="w-full pl-10 pr-4 py-3 bg-orange-50 border-2 border-orange-200 rounded-xl focus:outline-none focus:border-orange-500 font-bold text-gray-700"
            />
            <Hash class="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
          </div>

          <div v-if="postData.tags.length > 0" class="mb-6">
            <h4 class="text-xs font-bold text-gray-500 mb-2">已選標籤：</h4>
            <div class="flex flex-wrap gap-2">
              <span v-for="(tag, index) in postData.tags" :key="index" class="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-bold border border-orange-300 flex items-center gap-1">
                #{{ tag }}
                <button class="hover:text-red-500" @click="removeTag(index)"><X class="w-3 h-3"/></button>
              </span>
            </div>
          </div>

          <div>
            <h4 class="text-sm font-bold text-gray-500 mb-3">推薦話題 / 搜尋結果</h4>
            <button
              v-if="tagSearch"
              class="w-full text-left p-3 hover:bg-gray-100 rounded-lg flex items-center gap-3 mb-2 text-orange-600"
              @click="addTag(tagSearch)"
            >
              <div class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <span class="font-bold text-lg">+</span>
              </div>
              <div>
                <p class="font-bold">新增「{{ tagSearch }}」話題</p>
              </div>
            </button>

            <div class="space-y-2">
              <button
                v-for="tag in filteredTags"
                :key="tag"
                class="w-full text-left p-3 hover:bg-gray-100 rounded-lg flex items-center gap-3 transition-colors border-b border-gray-100"
                @click="addTag(tag)"
              >
                <div class="w-10 h-10 rounded-full bg-gray-200 border-2 border-black flex items-center justify-center font-bold text-gray-600">
                  #
                </div>
                <div>
                  <p class="font-bold text-gray-800">{{ tag }}</p>
                  <p class="text-xs text-gray-500">熱門討論話題</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div class="p-4 border-t-2 border-gray-200 flex justify-end bg-gray-50 gap-3">
           <button class="w-full py-2 text-sm font-bold text-white pixel-button bg-orange-500 hover:bg-orange-600 border-4 border-black" @click="nextStep">預覽文章</button>
        </div>
      </div>

      <div v-else-if="currentStep === 'preview'" class="flex flex-col h-full">
         <div class="p-4 border-b-2 border-gray-200 flex items-center gap-2">
          <button class="hover:bg-gray-200 p-1 rounded" @click="prevStep"><ArrowLeft class="w-5 h-5"/></button>
          <span class="font-bold text-lg">預覽文章</span>
        </div>

        <div class="p-6 flex-1 overflow-y-auto bg-gray-50">
           <div class="bg-white p-5 border-2 border-gray-200 rounded-lg shadow-sm">
              <div class="flex justify-between items-start mb-4">
                 <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gray-300 border border-gray-400"></div>
                    <div>
                      <p class="font-bold text-sm">Yuan</p>
                      <p class="text-xs text-gray-500">剛剛</p>
                    </div>
                 </div>
                 <span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold">{{ postData.board || '未分類' }}</span>
              </div>

              <h2 class="text-xl font-bold mb-3">{{ postData.title || '(無標題)' }}</h2>
              <p class="text-gray-700 whitespace-pre-wrap mb-4">{{ postData.content || '(無內容)' }}</p>

              <div class="flex flex-wrap gap-2">
                 <span v-for="tag in postData.tags" :key="tag" class="text-blue-500 text-sm font-bold">#{{ tag }}</span>
              </div>
           </div>
        </div>

        <div class="p-4 border-t-2 border-gray-200 bg-white flex gap-3">
           <button class="flex-1 py-2 text-sm font-bold text-gray-600 pixel-button bg-gray-200 border-4 border-black" @click="prevStep">返回修改</button>
           <button class="flex-1 py-2 text-sm font-bold text-white pixel-button bg-orange-500 hover:bg-orange-600 border-4 border-black" @click="handleFinalSubmit">確認發布</button>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
@keyframes popIn {
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
.animate-pop-in {
  animation: popIn 0.15s ease-out forwards;
}

.text-shadow {
  text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.1);
}

.pixel-card {
  border: 3px solid #8b6f47;
  box-shadow: 4px 4px 0px 0px rgba(139, 111, 71, 0.2), inset -1px -1px 0px 0px rgba(255, 255, 255, 0.3);
}

.pixel-button {
  box-shadow: 3px 3px 0px 0px rgba(139, 111, 71, 0.3), inset -1px -1px 0px 0px rgba(255, 255, 255, 0.4);
}
.pixel-button:active {
  box-shadow: none;
  transform: translateY(4px);
}
</style>
