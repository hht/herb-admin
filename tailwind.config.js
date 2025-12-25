/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary 主题色系 (Hue: 203, Saturation: 100%)
        primary: {
          DEFAULT: "#267347",
          50: "#F7FCFA",
          100: "#ECF9F1",
          200: "#D9F2E4",
          300: "#B3E5C9",
          400: "#8CD9AD",
          500: "#66CC92",
          600: "#40BF77",
          700: "#33995F",
          800: "#267347",
          900: "#1A4C30",
        },
        // Brand 品牌色
        brand: {
          DEFAULT: "#267347",
          light: "#ECF9F1",
        },
        // Success 成功色
        success: {
          DEFAULT: "#33995F",
        },
        // Neutral 中性色系 (Hue: 203, Saturation: 8%)
        neutral: {
          50: "#FAFAFA",
          100: "#F2F3F2",
          200: "#E4E7E5",
          300: "#CACECC",
          400: "#AFB6B2",
          500: "#959D98",
          600: "#7A857F",
          700: "#49504C",
          800: "#313533",
          900: "#181B19",
          950: "#000000",
        },
        // Neutral Special 特殊中性色 (用于昵称等强调)
        "neutral-special": {
          DEFAULT: "#49504C",
          light: "#FAFAFA",
        },
        // Border 边框色
        border: {
          DEFAULT: "#E4E7E5",
        },
      },
      fontFamily: {
        sans: [
          "Roboto",
          "Noto Sans SC",
          "PingFang SC",
          "Microsoft YaHei",
          "sans-serif",
        ],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        sm: "0 1px 3px hsla(203, 8%, 10%, 0.15), 1px 0 2px hsla(203, 8%, 10%, 0.1)",
        DEFAULT:
          "0 4px 4px hsla(203, 8%, 30%, 0.15), 2px 0 8px hsla(203, 8%, 10%, 0.1)",
        lg: "0 24px 36px hsla(203, 8%, 30%, 0.15), 8px 0 24px hsla(203, 8%, 10%, 0.1)",
      },
    },
  },
  plugins: [],
}
