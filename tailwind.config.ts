import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      keyframes: {
        wiggle: {
          "0%": { transform: "rotate(-0.5deg)" },
          "50%": { transform: "rotate(0.5deg)" },
          "100%": { transform: "rotate(-0.5deg)" },
        },
      },
      animation: {
        wiggle: "wiggle 0.3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
