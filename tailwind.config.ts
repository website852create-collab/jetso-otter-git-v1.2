import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        otter: {
          50: '#fdfbf7',  // 背景米白
          100: '#f7f3e8',
          200: '#ese3cf',
          300: '#dccfb3',
          400: '#c2a88f',
          500: '#a68b73', // 水獺毛色 (淺)
          600: '#8d6e63', // 主色
          700: '#75584f',
          800: '#4e342e', // 深褐色 (文字)
          900: '#3e2b26',
        },
        accent: {
          500: '#ff8f70', // 珊瑚橘 (CTA按鈕)
          600: '#e67a5c',
        }
      },
      fontFamily: {
        sans: ['Inter', 'PingFang TC', 'Microsoft JhengHei', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
export default config;