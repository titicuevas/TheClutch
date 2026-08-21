import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0c0f",
        panel: "#14161c",
        line: "#2a2e38",
        cream: "#f4ead6",
        mute: "#9a9386",
        gold: "#e8b84a",
        clutch: "#e23d2d",
        good: "#3dba8b",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
