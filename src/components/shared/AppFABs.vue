<script setup>
import {
  Bot as BotIcon,
  MessageSquare as MessageSquareIcon,
  Plus as PlusIcon,
  Zap as ZapIcon,
} from 'lucide-vue-next'

defineEmits(['open-posting', 'quick-action', 'toggle-private-chat', 'toggle-ai-chat'])
</script>

<template>
  <div
    class="fixed bottom-4 right-4 md:bottom-8 md:right-8 flex flex-col space-y-2 md:space-y-3 z-50"
  >
    <button
      class="p-3 md:p-4 w-14 h-14 bg-primary-600 text-white hover:bg-primary-700 flex items-center justify-center transition-transform hover:-translate-y-1 border-2 border-primary-700 shadow-primary-fab rounded-xl"
      title="發布新貼文"
      @click="$emit('open-posting')"
    >
      <PlusIcon class="w-6 h-6 md:w-7 md:h-7" />
    </button>

    <button
      class="p-3 md:p-4 w-14 h-14 bg-primary-500 text-white hover:bg-primary-600 flex items-center justify-center transition-transform hover:-translate-y-1 border-2 border-primary-700 shadow-primary-fab rounded-xl"
      title="抽卡找旅伴"
      @click="$emit('quick-action')"
    >
      <ZapIcon class="w-6 h-6 md:w-7 md:h-7" />
    </button>

    <button
      class="p-3 md:p-4 w-14 h-14 bg-primary-500 text-white hover:bg-primary-600 flex items-center justify-center transition-transform hover:-translate-y-1 border-2 border-primary-700 shadow-primary-fab rounded-xl"
      title="私人訊息"
      @click="$emit('toggle-private-chat')"
    >
      <MessageSquareIcon class="w-6 h-6 md:w-7 md:h-7" />
    </button>

    <button
      class="p-3 md:p-4 w-14 h-14 bg-primary-500 text-white hover:bg-primary-600 flex items-center justify-center transition-transform hover:-translate-y-1 border-2 border-primary-700 shadow-primary-fab rounded-xl"
      title="TripMate 助手"
      @click="$emit('toggle-ai-chat')"
    >
      <BotIcon class="w-6 h-6 md:w-7 md:h-7" />
    </button>
  </div>
</template>

