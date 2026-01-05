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
      class="p-3 md:p-4 bg-pink-400 text-white pixel-button hover:bg-pink-500 flex items-center justify-center transition-transform hover:-translate-y-1"
      style="border-radius: 4px; width: 56px; height: 56px"
      title="發布新貼文"
    >
      <PlusIcon class="w-6 h-6 md:w-7 md:h-7" />
    </button>

    <button
      @click="$emit('quick-action')"
      class="p-3 md:p-4 bg-amber-400 text-white pixel-button hover:bg-amber-500 flex items-center justify-center transition-transform hover:-translate-y-1"
      style="border-radius: 4px; width: 56px; height: 56px"
      title="抽卡找旅伴"
    >
      <ZapIcon class="w-6 h-6 md:w-7 md:h-7" />
    </button>

    <button
      @click="$emit('toggle-private-chat')"
      class="p-3 md:p-4 bg-green-400 text-white pixel-button hover:bg-green-500 flex items-center justify-center transition-transform hover:-translate-y-1"
      style="border-radius: 4px; width: 56px; height: 56px"
      title="私人訊息"
    >
      <MessageSquareIcon class="w-6 h-6 md:w-7 md:h-7" />
    </button>

    <button
      @click="$emit('toggle-ai-chat')"
      class="p-3 md:p-4 bg-orange-400 text-white pixel-button hover:bg-orange-500 flex items-center justify-center transition-transform hover:-translate-y-1"
      style="border-radius: 4px; width: 56px; height: 56px"
      title="TripMate 助手"
    >
      <BotIcon class="w-6 h-6 md:w-7 md:h-7" />
    </button>
  </div>
</template>

<style scoped>
.pixel-button {
  border: 3px solid #8b6f47;
  box-shadow:
    3px 3px 0px 0px rgba(139, 111, 71, 0.3),
    inset -1px -1px 0px 0px rgba(255, 255, 255, 0.4);
}
.pixel-button:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}
</style>
