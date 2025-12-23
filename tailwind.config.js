/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        好看一點的字體: ['Shippori Antique', 'sans-serif'],
        另一個好看一點的字體: ['Momo Trust Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
