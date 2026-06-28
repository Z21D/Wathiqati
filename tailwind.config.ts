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
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f5f5f7",
          subtle: "#fafafa",
        },
        ink: {
          DEFAULT: "#1d1d1f",
          secondary: "#6e6e73",
          tertiary: "#86868b",
        },
        brand: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#b9dcfd",
          300: "#7cc2fb",
          400: "#36a5f6",
          500: "#0c8ce9",
          600: "#006fd4",
          700: "#0158ab",
          800: "#064b8d",
          900: "#0b3f74",
        },
        accent: {
          green: "#34c759",
          amber: "#ff9f0a",
          orange: "#ff6723",
          red: "#ff3b30",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)",
        card: "0 1px 3px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)",
        float: "0 12px 40px rgba(0,0,0,0.08)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
      transitionTimingFunction: {
        apple: "cubic-bezier(0.25, 0.1, 0.25, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
