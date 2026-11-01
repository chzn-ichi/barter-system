/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#FFFFFF",
        primary: "#0F2A4A",
        secondary: "#3E5C84",
        accent: "#2F5D9E",
        card: "#F8FAFC",
        ink: "#0F172A",
        muted: "#64748B",
        border: "#E2E8F0",
        danger: "#B3261E",
        success: "#2E7D32",
        seal: "#2F5D9E",
      },
      fontFamily: {
        hand: ["DMSans_500Medium"],
      },
    },
  },
  plugins: [],
};