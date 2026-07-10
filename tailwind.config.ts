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
        navy: "#070d1a",
        "navy-light": "#0f1f38",
        "navy-mid": "#0b1529",
        "navy-border": "#1a2d4a",
        gold: "#e9b94a",
        "gold-light": "#f5d675",
        "gold-dark": "#c49a35",
      },
      boxShadow: {
        "gold-sm": "0 0 16px rgba(233,185,74,0.15)",
        "gold-md": "0 0 32px rgba(233,185,74,0.2)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.25s ease-out",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
