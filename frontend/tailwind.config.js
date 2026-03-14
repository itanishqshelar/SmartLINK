/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0A0A0F",
        surface: "#111118",
        borderline: "#1E1E2E",
        cyan: "#00E5FF",
        violet: "#7C3AED",
      },
      boxShadow: {
        glow: "0 0 30px rgba(0, 229, 255, 0.22)",
      },
      fontFamily: {
        mono: ["DM Mono", "monospace"],
        sans: ["Inter", "sans-serif"],
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        slideUp: {
          "0%": { opacity: 0, transform: "translateY(20px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        pulseCyan: {
          "0%, 100%": { boxShadow: "0 0 0 rgba(0, 229, 255, 0)" },
          "50%": { boxShadow: "0 0 18px rgba(0, 229, 255, 0.5)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.45s ease-out",
        slideUp: "slideUp 0.45s ease-out",
        pulseCyan: "pulseCyan 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
