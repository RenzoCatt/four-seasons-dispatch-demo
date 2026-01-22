/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#1EA7E1",
          blueDark: "#168FC2",
          dark: "#0F1115",
          panel: "#FFFFFF",
          muted: "#9CA3AF",
        },
      },
    },
  },
  plugins: [],
};
