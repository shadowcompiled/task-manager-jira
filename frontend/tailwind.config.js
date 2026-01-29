/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Use class-based dark mode, not system preference
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        danger: '#dc2626',
        success: '#16a34a',
        warning: '#ea580c',
      }
    },
  },
  plugins: [],
}
