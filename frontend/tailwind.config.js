/** Token mau/chu lay tu bo "T-Bike Tokens" trong Figma (QTDA - TBike - Figma). */
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#006B63", hover: "#00564F", soft: "#E6F6F4" },
        sidebar: { DEFAULT: "#083B38", active: "#0C5550", muted: "#B0DCD6" },
        ink: { DEFAULT: "#172F2B", muted: "#64748B" },
        line: "#DFE5ED",
        page: "#F4F6F9",
        subtle: "#F8FAFC",
        success: { DEFAULT: "#157347", bg: "#EAF6EF" },
        warning: { DEFAULT: "#B45309", bg: "#FFF4E5" },
        danger: { DEFAULT: "#BE1818", bg: "#FEF0EF" },
        info: { DEFAULT: "#1D4ED8", bg: "#EDF4FF" },
        brand: { aqua: "#6DFBEF" },
      },
      fontFamily: { sans: ["Inter", "system-ui", "Segoe UI", "Roboto", "sans-serif"] },
      fontSize: {
        eyebrow: ["11px", { lineHeight: "1.3", letterSpacing: "1px", fontWeight: "600" }],
        page: ["28px", { lineHeight: "1.25", letterSpacing: "-0.6px", fontWeight: "700" }],
        kpi: ["40px", { lineHeight: "1.2", letterSpacing: "-0.8px", fontWeight: "700" }],
        hero: ["56px", { lineHeight: "1.12", letterSpacing: "-1.4px", fontWeight: "700" }],
        h2: ["36px", { lineHeight: "1.2", letterSpacing: "-0.8px", fontWeight: "700" }],
      },
      borderRadius: { panel: "12px" },
      boxShadow: { card: "0 6px 20px rgba(15, 26, 26, 0.06)", focus: "0 0 0 4px rgba(0, 107, 99, 0.35)" },
    },
  },
  plugins: [],
};
