/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary 主题色系 (Hue: 203, Saturation: 100%)
        primary: {
          DEFAULT: "#267347",
          50: "#ECF9F1",
          100: "#ECF9F1",
          200: "#ECF9F1",
          300: "#267347",
          400: "#267347",
          500: "#267347",
          600: "#1A4C30",
          700: "#1A4C30",
          800: "#1A4C30",
          900: "#1A4C30",
        },
        // Brand 品牌色
        brand: {
          DEFAULT: "#267347",
          light: "#ECF9F1",
        },
        // Success 成功色
        success: {
          DEFAULT: "hsl(155, 100%, 50%)", // #00FF95
        },
        // Neutral 中性色系 (Hue: 203, Saturation: 8%)
        neutral: {
          50: "#F3F3F3",
          100: "#FFFFFF",
          200: "#E7E7E7",
          300: "#DCDCDC",
          400: "hsl(203, 8%, 70%)",
          500: "hsl(203, 8%, 60%)",
          600: "#777777",
          700: "hsl(203, 8%, 40%)",
          800: "hsl(203, 8%, 30%)",
          900: "hsl(203, 8%, 20%)",
          950: "#1D2129",
        },
        // Neutral Special 特殊中性色 (用于昵称等强调)
        "neutral-special": {
          DEFAULT: "hsl(220, 36%, 50%)", // #5270AD
          light: "hsl(220, 36%, 98%)", // #F8F9FC
        },
        // Border 边框色
        border: {
          DEFAULT: "#E7E7E7",
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
