import localFont from "next/font/local";
export const uiFont = localFont({ src: "../../../public/fonts/ui-variable.woff2", variable: "--font-ui", weight: "300 900", display: "swap" });
export const displayFont = localFont({ src: "../../../public/fonts/display-variable.woff2", variable: "--font-display", weight: "200 800", display: "swap" });
export const codeFont = localFont({ src: "../../../public/fonts/mono-variable.woff2", variable: "--font-code", weight: "100 800", display: "swap" });
export const bengaliFont = localFont({ src: "../../../public/fonts/bengali-variable.woff2", variable: "--font-bengali", weight: "100 900", display: "swap", declarations: [{ prop: "unicode-range", value: "U+0980-09FF,U+200C-200D" }] });
