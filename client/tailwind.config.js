/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // The whole palette lives here: components use these names, never raw Tailwind hues.
      // Every text colour clears 4.5:1 on canvas, surface and sunken.
      colors: {
        canvas: "#F3EEE3",
        surface: "#FBF8F2",
        sunken: "#E9E3D5",
        line: {
          DEFAULT: "#DED7C8",
          strong: "#C8C0AF",
        },
        ink: {
          DEFAULT: "#111111",
          hover: "#2E2C28",
          soft: "#2E2C28",
          muted: "#5C574D",
          faint: "#696357",
        },
        danger: {
          DEFAULT: "#9A3324",
          hover: "#7F2A1D",
          soft: "#F5E3DA",
          line: "#E5C3B5",
        },
        success: {
          DEFAULT: "#3B6647",
          line: "#BFD0BF",
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', "system-ui", "-apple-system", '"Segoe UI"', "Roboto", "sans-serif"],
        serif: ['"Instrument Serif"', "Georgia", "serif"],
      },
      keyframes: {
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.35s ease-out both",
        "fade-in": "fade-in 0.3s ease-out both",
      },
    },
  },
  plugins: [],
}
