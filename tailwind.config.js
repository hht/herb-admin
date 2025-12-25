/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary 主题色系 (Hue: 203, Saturation: 100%)
        primary: {
          DEFAULT: "hsl(203, 100%, 50%)", // #009EFF
          50: "hsl(203, 100%, 95%)", // #E5F5FF
          100: "hsl(203, 100%, 90%)",
          200: "hsl(203, 100%, 80%)",
          300: "hsl(203, 100%, 70%)",
          400: "hsl(203, 100%, 60%)",
          500: "hsl(203, 100%, 50%)", // #009EFF 基色
          600: "hsl(203, 100%, 40%)",
          700: "hsl(203, 100%, 30%)",
          800: "hsl(203, 100%, 20%)",
          900: "hsl(203, 100%, 10%)",
        },
        // Brand 品牌色
        brand: {
          DEFAULT: "hsl(218, 95%, 43%)", // #0052D9
          light: "hsl(233, 52%, 96%)", // #F2F3FF
        },
        // Success 成功色
        success: {
          DEFAULT: "hsl(155, 100%, 50%)", // #00FF95
        },
        // Neutral 中性色系 (Hue: 203, Saturation: 8%)
        neutral: {
          50: "hsl(203, 8%, 98%)", // #F9FAFA
          100: "hsl(203, 8%, 95%)", // #F1F2F3
          200: "hsl(203, 8%, 90%)", // #E3E6E8
          300: "hsl(203, 8%, 80%)",
          400: "hsl(203, 8%, 70%)", // #ACB4B9
          500: "hsl(203, 8%, 60%)", // #919BA1
          600: "hsl(203, 8%, 50%)", // #75828A
          700: "hsl(203, 8%, 40%)",
          800: "hsl(203, 8%, 30%)", // #464E53
          900: "hsl(203, 8%, 20%)",
          950: "hsl(203, 8%, 10%)", // #171A1C
        },
        // Neutral Special 特殊中性色 (用于昵称等强调)
        "neutral-special": {
          DEFAULT: "hsl(220, 36%, 50%)", // #5270AD
          light: "hsl(220, 36%, 98%)", // #F8F9FC
        },
        // Border 边框色
        border: {
          DEFAULT: "#e7e7e7",
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
