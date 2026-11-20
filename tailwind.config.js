/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // The departures board: graphite housing, flap tiles, warm flap-white ink, signal lamps.
      colors: {
        board: { DEFAULT: "#17181B", deep: "#111214", rail: "#1C1D21" },
        tile: { DEFAULT: "#26272B", hi: "#2E2F34", edge: "#0C0D0F", line: "#33343A" },
        ink: { DEFAULT: "#F1EDE4", muted: "#A9A59D", faint: "#76736C" },
        signal: { DEFAULT: "#FFC72C", deep: "#E8AE00", ink: "#1A1505" },
        go: "#3DD68C",
        stop: "#FF5A3C",
      },
      fontFamily: {
        sans: ['"Sofia Sans Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
        board: ['"Sofia Sans Extra Condensed Variable"', '"Sofia Sans Variable"', "ui-sans-serif", "sans-serif"],
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.23, 1, 0.32, 1)",
        drawer: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
    },
  },
  plugins: [],
};
