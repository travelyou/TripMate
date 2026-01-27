<script setup>
import { Home, Package, FileText, Settings, LogOut, ExternalLink } from 'lucide-vue-next'

defineProps({
  activeTab: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:activeTab', 'logout', 'switchToFrontend'])

const menuItems = [
  { key: 'basic_info', label: '基本資料', icon: Settings },
  { key: 'itineraries', label: '行程管理', icon: Package },
  { key: 'posts', label: '貼文管理', icon: FileText }
]
</script>

<template>
  <aside class="fixed left-0 top-16 w-64 bg-white border-r border-gray-200 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto z-40">
    <div class="p-6 border-b border-gray-200">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
          <Home class="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 class="font-bold text-gray-900">管理中心</h2>
          <p class="text-xs text-gray-500">Vendor Dashboard</p>
        </div>
      </div>
    </div>

    <nav class="flex-1 p-4 space-y-1">
      <button
        v-for="item in menuItems"
        :key="item.key"
        :class="[
          'w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200',
          activeTab === item.key
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
        ]"
        @click="emit('update:activeTab', item.key)"
      >
        <component :is="item.icon" class="w-5 h-5" />
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <div class="p-4 border-t border-gray-200 space-y-2">
      <button
        class="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200"
        @click="emit('switchToFrontend')"
      >
        <ExternalLink class="w-5 h-5" />
        <span>切換到前台</span>
      </button>

      <button
        class="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
        @click="emit('logout')"
      >
        <LogOut class="w-5 h-5" />
        <span>登出</span>
      </button>
    </div>
  </aside>
</template>
