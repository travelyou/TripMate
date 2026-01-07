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
        primary: {
          DEFAULT: '#9bd75bff',
          dark: '#52bc20ff',
          light: '#d6f5abff',
          hover: '#f0f6eaff',
        },
        secondary: {
          DEFAULT: '#103538',
          50: '#e6ebeb',
          100: '#cdd6d7',
          200: '#9bb0b1',
          300: '#6a8b8c',
          400: '#396566',
          500: '#103538',
          600: '#0d2b2d',
          700: '#0a2123',
          800: '#061619',
          900: '#030b0c',
        },
        accent: {
          DEFAULT: '#f3826bff',
          50: '#fff0ed',
          100: '#fee1db',
          200: '#fdc3b7',
          300: '#fca593',
          400: '#fb877f',
          500: '#f3826bff',
          600: '#d6695a',
          700: '#b85049',
          800: '#9a3738',
          900: '#7d1e27',
        },
        gold: {
          DEFAULT: '#f3c85bff',
          50: '#fef7e7',
          100: '#fdeecf',
          200: '#fbdca0',
          300: '#f9cb70',
          400: '#f7b941',
          500: '#f3c85bff',
          600: '#d0a34b',
          700: '#ad7f3b',
          800: '#8a5a2b',
          900: '#67361b',
        },
      },
    },
  },
  plugins: [],
}
