/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        好看一點的字體: ['Shippori Antique', 'sans-serif'],
        另一個好看一點的字體: ['Momo Trust Sans', 'sans-serif'],
      },

      colors: {
        primary: '#1E40AF', // 自訂一個主色 (藍色)
        secondary: '#DC2626', // 自訂一個次色 (紅色)
        // 也可以定義一個顏色系列，方便使用深淺變化
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6', // 這是主要的 brand 顏色
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af', // 這裡可以設為你的 primary
          900: '#1e3a8a',
          950: '#172554',
        },
      },
    },
    plugins: [],
  },
}
