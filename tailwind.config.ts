import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        void: {
          DEFAULT: "var(--bg-page)",
          pure: "var(--bg-page)",
          surface: "var(--bg-surface)",
          card: "var(--bg-card)",
          muted: "var(--bg-muted)",
          border: "var(--border-color)",
          borderLight: "var(--border-subtle)",
        },
        brand: {
          primary: "var(--accent-primary)",
          cyan: "var(--accent-primary)",
          cyanGlow: "transparent",
          emerald: "#10B981",
          emeraldGlow: "transparent",
          blue: "#2563EB",
          sky: "#0284C7",
          purple: "#7C3AED",
          amber: "#D97706",
          rose: "#E11D48",
          soft: "var(--accent-soft)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sora)", "system-ui", "sans-serif"],
        mono: ["var(--font-ibm-plex-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        "card-clean": "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
        "card-elevated": "0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
        "cyan-glow": "none",
        "emerald-glow": "none",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        ticker: "ticker 25s linear infinite",
      },
      keyframes: {
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
