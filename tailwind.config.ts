import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        autronis: {
          bg: "var(--bg)",
          card: "var(--card)",
          accent: "var(--accent)",
          "accent-hover": "var(--accent-hover)",
          success: "var(--success)",
          warning: "var(--warning)",
          danger: "var(--danger)",
          "text-primary": "var(--text-primary)",
          "text-secondary": "var(--text-secondary)",
          border: "var(--border)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
