import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        app: {
          background: "#f1f5f9",
          card: "#ffffff",
          ink: "#0f172a",
          primary: "#2563eb",
          success: "#10b981",
          warning: "#f59e0b",
          danger: "#ef4444",
          muted: "#64748b",
          border: "#e2e8f0",
        },
      },
      borderRadius: {
        phone: "30px",
        panel: "24px",
        card: "18px",
      },
      boxShadow: {
        card: "0 6px 24px rgba(15, 23, 42, 0.06)",
        phone: "0 18px 50px rgba(15, 23, 42, 0.22)",
      },
      fontFamily: {
        sans: [
          "Noto Sans KR",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Apple SD Gothic Neo",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
