import type { Config } from "tailwindcss";
const color = (name: string) => `rgb(var(--ds-${name}) / <alpha-value>)`;
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"], darkMode: "class",
  theme: { extend: {
    colors: {
      canvas: color("canvas"), surface: { DEFAULT: color("surface"), muted: color("surface-muted") },
      card: color("card"), border: { DEFAULT: color("border"), strong: color("border-strong") },
      ink: { DEFAULT: color("ink"), solid: color("ink-solid"), 800: color("ink-800"), 700: color("ink-700") },
      muted: color("muted"), brand: { DEFAULT: color("brand"), hover: color("brand-hover"), soft: color("brand-soft"), 700: color("teal-700"), 600: color("teal-600"), 500: color("teal-500") },
      accent: { DEFAULT: color("accent"), soft: color("accent-soft"), 400: color("mint-400"), 200: color("mint-200") },
      success: color("success"), warning: color("warning"), danger: color("danger"), info: color("info"),
      "on-brand": color("on-brand"), "on-ink": color("on-ink"),
      white: color("paper"), black: color("ink-solid"),
    },
    fontFamily: { sans: ["var(--font-ui)", "var(--font-bengali)", "sans-serif"], display: ["var(--font-display)", "var(--font-bengali)", "sans-serif"], mono: ["var(--font-code)", "var(--font-bengali)", "monospace"] },
    fontSize: { xs: ["0.75rem", "1.5"], sm: ["0.875rem", "1.5"], base: ["1rem", "1.6"], lg: ["1.125rem", "1.5"], xl: ["1.25rem", "1.5"], "2xl": ["1.5rem", "1.35"], "3xl": ["2rem", "1.2"], "4xl": ["2.75rem", "1.15"], "5xl": ["3.75rem", "1.1"] },
    borderRadius: { sm: "6px", md: "10px", lg: "14px", xl: "20px" },
    maxWidth: { marketing: "1200px", dashboard: "1440px" },
    boxShadow: Object.fromEntries(["flat", "raised", "floating", "overlay", "sm", "md", "lg", "xl", "2xl", "card-clean", "card-elevated"].map(name => [name, `var(--elevation-${({sm:"raised",md:"raised",lg:"floating",xl:"floating","2xl":"overlay","card-clean":"raised","card-elevated":"floating"} as Record<string,string>)[name] || name})`])),
    transitionTimingFunction: { precision: "cubic-bezier(.2,.7,.2,1)" },
    animation: { ticker: "ticker 25s linear infinite" },
    keyframes: { ticker: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } } },
  } }, plugins: [],
};
export default config;
