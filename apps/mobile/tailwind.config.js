/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ChatGPT-like neutral palette; accent used sparingly for focus/active states
        ink: { DEFAULT: '#0d0d0d', soft: '#5d5d5d', faint: '#8e8e8e' },
        paper: { DEFAULT: '#ffffff', soft: '#f4f4f4', line: '#e5e5e5' },
        night: { DEFAULT: '#212121', soft: '#2f2f2f', deep: '#171717', line: '#3a3a3a' },
        accent: { DEFAULT: '#10a37f', soft: '#e7f6f2' },
        danger: { DEFAULT: '#e5484d', soft: '#fdecec' },
      },
      borderRadius: { bubble: '22px' },
    },
  },
  plugins: [],
};
