<script setup>
import { X, MessageCircle } from 'lucide-vue-next'

defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  friends: {
    type: Array,
    default: () => []
  }
})

defineEmits(['close', 'chat', 'open-profile'])
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
    @click.self="$emit('close')"
  >
    <div
      class="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-pop-in overflow-hidden flex flex-col max-h-[80vh]"
    >
      <!-- Header -->
      <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <h3 class="text-lg font-bold text-gray-800">好友列表 ({{ friends.length }})</h3>
        <button
          class="p-2 hover:bg-gray-100 rounded-full transition"
          @click="$emit('close')"
        >
          <X class="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <!-- List -->
      <div class="overflow-y-auto p-4 space-y-2 flex-1">
        <div
          v-if="friends.length === 0"
          class="text-center text-gray-400 py-8"
        >
          還沒有加任何好友喔！
        </div>

        <div
          v-for="friend in friends"
          :key="friend.id"
          class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition group cursor-pointer"
          @click="$emit('chat', friend)"
        >
          <button
            class="flex items-center gap-3 text-left"
            type="button"
            @click.stop="$emit('open-profile', friend)"
          >
            <img
              :src="friend.avatar"
              class="w-10 h-10 rounded-full bg-gray-200 object-cover border border-gray-100"
              alt="Avatar"
            />
            <div>
              <div class="font-bold text-gray-800 text-sm">{{ friend.name }}</div>
              <div class="text-xs text-gray-500">@{{ friend.nickname }}</div>
            </div>
          </button>

          <button
            class="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full transition opacity-100 group-hover:opacity-100"
            title="聊聊"
            @click.stop="$emit('chat', friend)"
          >
            <MessageCircle class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-pop-in {
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes popIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style>
