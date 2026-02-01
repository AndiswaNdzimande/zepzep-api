/** @type {import('tailwindcss').Config} */

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],

  theme: {
    extend: {
      colors: {
        "zepzep-blue": "#0066CC",

        "zepzep-dark": "#003366",

        "zepzep-light": "#E6F2FF",
      },
    },
  },

  plugins: [],
};
