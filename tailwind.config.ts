import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#171717",
          muted: "#4A4A4A",
          subtle: "#737373",
        },
        ivory: {
          DEFAULT: "#F5F1E8",
          surface: "#FFFFFF",
          alt: "#EBE5D8",
          dark: "#E0D8C8",
        },
        cobalt: {
          DEFAULT: "#3157D5",
          hover: "#2545B8",
          light: "#EAEFFF",
        },
        golden: {
          DEFAULT: "#F4C542",
          hover: "#E0B332",
          light: "#FEF7E6",
        },
        coral: {
          DEFAULT: "#F27661",
          hover: "#DE5D47",
          light: "#FEECE9",
        },
        mint: {
          DEFAULT: "#8ED8B0",
          hover: "#75C499",
          light: "#EAF8F1",
        },
        lavender: {
          DEFAULT: "#B8A7E8",
          hover: "#9E8AD6",
          light: "#F3F0FA",
        },
        detective: {
          bg: "var(--color-bg)",
          surface: "var(--color-surface)",
          "surface-alt": "var(--color-surface-alt)",
          border: "var(--color-border)",
          text: "var(--color-text)",
          muted: "var(--color-text-muted)",
          ink: "#171717",
          ivory: "#F5F1E8",
          cobalt: "#3157D5",
          yellow: "#F4C542",
          coral: "#F27661",
          mint: "#8ED8B0",
          lavender: "#B8A7E8",
          red: "#F27661",
          "red-hover": "#DE5D47",
          tape: "#F4C542",
          dark: "#171717",
        },
      },
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "Cascadia Code",
          "SF Mono",
          "Consolas",
          "monospace",
        ],
        sans: [
          "Public Sans",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        display: [
          "Impact",
          "Anton",
          "Cabinet Grotesk",
          "Public Sans",
          "sans-serif",
        ],
      },
      boxShadow: {
        brutal: "4px 4px 0px #171717",
        "brutal-sm": "2px 2px 0px #171717",
        "brutal-lg": "6px 6px 0px #171717",
        "brutal-xl": "8px 8px 0px #171717",
        "brutal-cobalt": "4px 4px 0px #3157D5",
        "brutal-golden": "4px 4px 0px #F4C542",
        "brutal-coral": "4px 4px 0px #F27661",
        "brutal-mint": "4px 4px 0px #8ED8B0",
        "brutal-lavender": "4px 4px 0px #B8A7E8",
      },
    },
  },
  plugins: [],
};
export default config;
