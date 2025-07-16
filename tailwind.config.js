/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'anti-flash-white': '#F2F3F4',
        'lace-cap': '#EBEAED',
        'deep-sea': '#2000B1',
        'dark-royalty': '#02066F',
        'midnight-blue': '#020035',
        'kimchi': '#ED4B00',
      },
      fontFamily: {
        sans: ["Poppins", "sans-serif"],
      },
    },
  },
  plugins: [],
}; 