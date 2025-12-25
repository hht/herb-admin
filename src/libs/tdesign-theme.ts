/**
 * TDesign 主题配置
 * 基于设计图的颜色系统和 Tailwind 配置
 */

export const tdesignTheme = {
  // 主色
  brandColor: "hsl(203, 100%, 50%)", // #009EFF

  // 警告色
  warningColor: "hsl(30, 100%, 50%)",

  // 错误色
  errorColor: "hsl(0, 84%, 60%)",

  // 成功色
  successColor: "hsl(155, 100%, 50%)", // #00FF95

  // 文字颜色
  textColor: {
    primary: "hsl(203, 8%, 10%)", // #171A1C
    secondary: "hsl(203, 8%, 50%)", // #75828A
    placeholder: "hsl(203, 8%, 60%)", // #919BA1
    disabled: "hsl(203, 8%, 70%)", // #ACB4B9
  },

  // 背景颜色
  bgColor: {
    page: "hsl(203, 8%, 98%)", // #F9FAFA
    container: "#FFFFFF",
    component: "hsl(203, 8%, 95%)", // #F1F2F3
    componentDisabled: "hsl(203, 8%, 90%)", // #E3E6E8
  },

  // 边框颜色
  borderColor: {
    default: "#e7e7e7",
    component: "hsl(203, 8%, 90%)", // #E3E6E8
  },

  // 阴影
  shadow: {
    1: "0 1px 3px hsla(203, 8%, 10%, 0.15), 1px 0 2px hsla(203, 8%, 10%, 0.1)",
    2: "0 4px 4px hsla(203, 8%, 30%, 0.15), 2px 0 8px hsla(203, 8%, 10%, 0.1)",
    3: "0 24px 36px hsla(203, 8%, 30%, 0.15), 8px 0 24px hsla(203, 8%, 10%, 0.1)",
  },

  // 圆角
  borderRadius: {
    small: "4px",
    medium: "8px",
    large: "12px",
    extraLarge: "16px",
  },

  // 字体
  fontFamily: {
    base: "Roboto, 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
}

/**
 * 生成 TDesign ConfigProvider 的 theme 配置
 */
export const getTDesignThemeConfig = () => ({
  // 品牌色
  brand: tdesignTheme.brandColor,

  // 警告色
  warning: tdesignTheme.warningColor,

  // 错误色
  error: tdesignTheme.errorColor,

  // 成功色
  success: tdesignTheme.successColor,
})

/**
 * CSS 变量定义（用于全局样式）
 */
export const cssVariables = `
  :root {
    /* 主色系 */
    --td-brand-color: ${tdesignTheme.brandColor};
    --td-warning-color: ${tdesignTheme.warningColor};
    --td-error-color: ${tdesignTheme.errorColor};
    --td-success-color: ${tdesignTheme.successColor};

    /* 文字颜色 */
    --td-text-color-primary: ${tdesignTheme.textColor.primary};
    --td-text-color-secondary: ${tdesignTheme.textColor.secondary};
    --td-text-color-placeholder: ${tdesignTheme.textColor.placeholder};
    --td-text-color-disabled: ${tdesignTheme.textColor.disabled};

    /* 背景颜色 */
    --td-bg-color-page: ${tdesignTheme.bgColor.page};
    --td-bg-color-container: ${tdesignTheme.bgColor.container};
    --td-bg-color-component: ${tdesignTheme.bgColor.component};
    --td-bg-color-component-disabled: ${tdesignTheme.bgColor.componentDisabled};

    /* 边框颜色 */
    --td-border-color: ${tdesignTheme.borderColor.default};
    --td-border-color-component: ${tdesignTheme.borderColor.component};

    /* 阴影 */
    --td-shadow-1: ${tdesignTheme.shadow[1]};
    --td-shadow-2: ${tdesignTheme.shadow[2]};
    --td-shadow-3: ${tdesignTheme.shadow[3]};

    /* 圆角 */
    --td-radius-small: ${tdesignTheme.borderRadius.small};
    --td-radius-medium: ${tdesignTheme.borderRadius.medium};
    --td-radius-large: ${tdesignTheme.borderRadius.large};
    --td-radius-extra-large: ${tdesignTheme.borderRadius.extraLarge};

    /* 字体 */
    --td-font-family: ${tdesignTheme.fontFamily.base};
  }
`

export type TDesignTheme = typeof tdesignTheme
