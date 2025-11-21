import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          cream: '#fff9ea',
          brown: '#9d5328',
          dark: '#1a0902',
          orange: '#e86c19',
        }
      },
    },
  },
  plugins: [],
}

export default config
