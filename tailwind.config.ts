import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        atlas: {
          bg: "rgb(var(--atlas-bg) / <alpha-value>)",
          surface: "rgb(var(--atlas-surface) / <alpha-value>)",
          accent: "rgb(var(--atlas-accent) / <alpha-value>)",
          "accent-hover": "rgb(var(--atlas-accent-hover) / <alpha-value>)",
          text: "rgb(var(--atlas-text) / <alpha-value>)",
          muted: "rgb(var(--atlas-muted) / <alpha-value>)",
          border: "rgb(var(--atlas-border) / <alpha-value>)",
          chrome: "rgb(var(--atlas-chrome) / <alpha-value>)",
          danger: "#EF4444",
          success: "#10B981",
        },
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
