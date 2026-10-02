/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#F7F3EA",
        primary: "#243B53",
        secondary: "#526D82",
        accent: "#8B6F47",
        card: "#FFFFF8",
        ink: "#263238",
        muted: "#6B7280",
        border: "#DDD6C8",
        danger: "#B3261E",
        success: "#2E7D32",
        seal: "#A8412F",
      },
      fontFamily: {
        hand: ["DMSans_500Medium"],
      },
    },
  },
  plugins: [],
};