import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#F2F6F0",
        surface: "#FFFFFF",
        ink: "#1B2420",
        "ink-soft": "#5B6660",
        brand: {
          DEFAULT: "#1E56A0",
          dark: "#123D73",
        },
        accent: {
          DEFAULT: "#E4A93A",
          ink: "#3A2405",
        },
        line: "#DCE3D8",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;