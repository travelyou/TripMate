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
      @click="$emit('open-posting')"
      class="p-3 md:p-4 bg-primary-600 text-white hover:bg-primary-700 flex items-center justify-center transition-transform hover:-translate-y-1 border-2 border-primary-700 shadow-[3px_3px_0px_0px_rgba(7,52,76,0.3)] rounded-xl"
      style="width: 56px; height: 56px"
      title="發布新貼文"
    >
      <PlusIcon class="w-6 h-6 md:w-7 md:h-7" />
    </button>

    <button
      @click="$emit('quick-action')"
      class="p-3 md:p-4 bg-primary-500 text-white hover:bg-primary-600 flex items-center justify-center transition-transform hover:-translate-y-1 border-2 border-primary-700 shadow-[3px_3px_0px_0px_rgba(7,52,76,0.3)] rounded-xl"
      style="width: 56px; height: 56px"
      title="抽卡找旅伴"
    >
      <ZapIcon class="w-6 h-6 md:w-7 md:h-7" />
    </button>

    <button
      @click="$emit('toggle-private-chat')"
      class="p-3 md:p-4 bg-secondary-600 text-white hover:bg-secondary-700 flex items-center justify-center transition-transform hover:-translate-y-1 border-2 border-primary-700 shadow-[3px_3px_0px_0px_rgba(7,52,76,0.3)] rounded-xl"
      style="width: 56px; height: 56px"
      title="私人訊息"
    >
      <MessageSquareIcon class="w-6 h-6 md:w-7 md:h-7" />
    </button>

    <button
      @click="$emit('toggle-ai-chat')"
      class="p-3 md:p-4 bg-primary-500 text-white hover:bg-primary-600 flex items-center justify-center transition-transform hover:-translate-y-1 border-2 border-primary-700 shadow-[3px_3px_0px_0px_rgba(7,52,76,0.3)] rounded-xl"
      style="width: 56px; height: 56px"
      title="TripMate 助手"
    >
      <BotIcon class="w-6 h-6 md:w-7 md:h-7" />
    </button>
  </div>
</template>

<style scoped>
/* pixel-button replaced by Tailwind-like classes in template */
</style>
