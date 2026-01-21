import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import parserVue from 'vue-eslint-parser' // 引入 Vue 解析器
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfig([
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,mjs,jsx,vue}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

  // 1. 全局環境設置 (Browser)
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  // 2. 應用 Vue 推薦配置
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'], // 使用 'recommended' 確保覆蓋更多規則

  // 3. 修正 Vue 3 <script setup> 中的全局宏定義
  {
    name: 'app/vue-macros',
    // 設置 Vue 解析器
    languageOptions: {
      parser: parserVue,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      // 🚨 關鍵修正：定義 Vue 3 宏為全局變量，讓 Linter 識別它們
      globals: {
        defineProps: 'readonly',
        defineEmits: 'readonly',
        defineExpose: 'readonly',
        withDefaults: 'readonly',
      },
    },
    // 設置 Vue 規則，確保能解析 Vue 文件
    plugins: {
      vue: pluginVue,
    },
    rules: {
      // 可選：如果你希望強制使用 Vue 3 的命名風格，可以添加：
      // 'vue/multi-word-component-names': 'off',
    },
  },

  // 4. Prettier 格式化規則 (最後執行)
  skipFormatting,
])
