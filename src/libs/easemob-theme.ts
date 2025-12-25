/**
 * 环信 UIKit 自定义主题配置
 * 基于环信设计指南：https://doc.easemob.com/uikit/chatroomuikit/web/design_guide.html
 */

export const easemobTheme = {
  mode: "light" as const,

  // 圆角配置 - 使用 Small 风格（硬朗主题）
  avatarShape: "square" as const,
  bubbleShape: "square" as const,
  componentsShape: "square" as const,

  // 颜色配置 - 基于 Figma 设计图
  primaryColor: "#009EFF", // Primary/5

  // 自定义 CSS 变量覆盖
  customCss: `
    :root {
      /* Primary 主题色系 (Hue: 203) */
      --cui-primary-0: hsl(203, 100%, 0%);
      --cui-primary-1: hsl(203, 100%, 10%);
      --cui-primary-2: hsl(203, 100%, 20%);
      --cui-primary-3: hsl(203, 100%, 30%);
      --cui-primary-4: hsl(203, 100%, 40%);
      --cui-primary-5: hsl(203, 100%, 50%);     /* #009EFF 基色 */
      --cui-primary-6: hsl(203, 100%, 60%);
      --cui-primary-7: hsl(203, 100%, 70%);
      --cui-primary-8: hsl(203, 100%, 80%);
      --cui-primary-9: hsl(203, 100%, 90%);
      --cui-primary-95: hsl(203, 100%, 95%);    /* #E5F5FF 浅蓝背景 */
      --cui-primary-98: hsl(203, 100%, 98%);
      --cui-primary-100: hsl(203, 100%, 100%);

      /* Secondary 成功色系 (Hue: 155) */
      --cui-secondary-5: hsl(155, 100%, 50%);   /* #00FF95 */

      /* Neutral 中性色系 (Hue: 203, Saturation: 8%) */
      --cui-neutral-0: hsl(203, 8%, 0%);
      --cui-neutral-1: hsl(203, 8%, 10%);       /* #171A1C */
      --cui-neutral-2: hsl(203, 8%, 20%);
      --cui-neutral-3: hsl(203, 8%, 30%);       /* #464E53 */
      --cui-neutral-4: hsl(203, 8%, 40%);
      --cui-neutral-5: hsl(203, 8%, 50%);       /* #75828A */
      --cui-neutral-6: hsl(203, 8%, 60%);       /* #919BA1 */
      --cui-neutral-7: hsl(203, 8%, 70%);       /* #ACB4B9 */
      --cui-neutral-8: hsl(203, 8%, 80%);
      --cui-neutral-9: hsl(203, 8%, 90%);       /* #E3E6E8 */
      --cui-neutral-95: hsl(203, 8%, 95%);      /* #F1F2F3 */
      --cui-neutral-98: hsl(203, 8%, 98%);      /* #F9FAFA */
      --cui-neutral-100: hsl(203, 8%, 100%);

      /* Neutral Special 特殊中性色 (Hue: 220, Saturation: 36%) */
      --cui-neutral-special-5: hsl(220, 36%, 50%); /* #5270AD 昵称等强调色 */
      --cui-neutral-special-98: hsl(220, 36%, 98%); /* #F8F9FC */

      /* Brand 品牌色 */
      --cui-brand-7: hsl(218, 95%, 43%);        /* #0052D9 */
      --cui-brand-1: hsl(233, 52%, 96%);        /* #F2F3FF */

      /* 圆角配置 */
      --cui-radius-none: 0px;
      --cui-radius-extra-small: 2px;
      --cui-radius-small: 4px;
      --cui-radius-medium: 8px;
      --cui-radius-large: 12px;
      --cui-radius-extra-large: 16px;

      /* 组件圆角应用 */
      --cui-avatar-radius: var(--cui-radius-small);
      --cui-bubble-radius: var(--cui-radius-small);
      --cui-button-radius: var(--cui-radius-small);
      --cui-input-radius: var(--cui-radius-small);
      --cui-card-radius: var(--cui-radius-medium);

      /* 字体配置 */
      --cui-font-family-zh: "Noto Sans SC", "PingFang SC", sans-serif;
      --cui-font-family-en: "Roboto", sans-serif;
      --cui-font-family: var(--cui-font-family-en), var(--cui-font-family-zh);

      /* 阴影配置 */
      --cui-shadow-small: 0 1px 3px hsla(203, 8%, 10%, 0.15), 1px 0 2px hsla(203, 8%, 10%, 0.1);
      --cui-shadow-medium: 0 4px 4px hsla(203, 8%, 30%, 0.15), 2px 0 8px hsla(203, 8%, 10%, 0.1);
      --cui-shadow-large: 0 24px 36px hsla(203, 8%, 30%, 0.15), 8px 0 24px hsla(203, 8%, 10%, 0.1);

      /* 布局尺寸 */
      --cui-sidebar-width: 232px;
      --cui-conversation-list-width: 360px;
      --cui-header-height: 56px;
      --cui-input-bar-height: 60px;
    }

    /* 覆盖环信默认样式 */
    .cui-container {
      background-color: var(--cui-neutral-98) !important;
    }

    /* 会话列表样式 */
    .cui-conversation-list {
      background-color: var(--cui-neutral-95) !important;
    }

    .cui-conversationItem {
      border-radius: var(--cui-radius-small) !important;
      margin: 4px 8px !important;
    }

    .cui-conversationItem:hover {
      background-color: hsl(203, 8%, 96%) !important;
    }

    .cui-conversationItem--active {
      background-color: var(--cui-brand-1) !important;
    }

    /* 消息气泡样式 */
    .cui-message-bubble {
      border-radius: var(--cui-radius-small) !important;
      padding: 8px 12px !important;
      max-width: 460px !important;
    }

    .cui-message-bubble--self {
      background-color: var(--cui-primary-5) !important;
      color: white !important;
    }

    .cui-message-bubble--other {
      background-color: var(--cui-primary-95) !important;
      color: var(--cui-neutral-1) !important;
    }

    /* 头像样式 */
    .cui-avatar {
      border-radius: var(--cui-radius-small) !important;
    }

    /* 输入框样式 */
    .cui-message-input {
      background-color: var(--cui-neutral-95) !important;
      border-radius: var(--cui-radius-small) !important;
      border: none !important;
    }

    .cui-message-input:focus {
      background-color: white !important;
      border: 1px solid var(--cui-primary-5) !important;
    }

    /* 按钮样式 */
    .cui-button {
      border-radius: var(--cui-radius-small) !important;
    }

    .cui-button--primary {
      background-color: var(--cui-primary-5) !important;
    }

    .cui-button--primary:hover {
      background-color: var(--cui-primary-6) !important;
    }

    /* 未读消息徽章 */
    .cui-badge {
      background-color: var(--cui-primary-5) !important;
      border-radius: var(--cui-radius-medium) !important;
      min-width: 16px !important;
      height: 16px !important;
      font-size: 12px !important;
    }

    /* 聊天区域背景 */
    .cui-chat {
      background-color: var(--cui-neutral-98) !important;
    }

    /* 消息列表背景 */
    .cui-message-list {
      background-color: var(--cui-neutral-98) !important;
    }

    /* 时间戳样式 */
    .cui-message-timestamp {
      color: var(--cui-neutral-6) !important;
      font-size: 12px !important;
    }

    /* 用户名样式 */
    .cui-message-username {
      color: var(--cui-neutral-special-5) !important;
      font-size: 14px !important;
      font-weight: 500 !important;
    }

    /* 输入工具栏 */
    .cui-message-editor-toolbar {
      border-top: 1px solid hsl(0, 0%, 91%) !important;
      background-color: white !important;
    }

    /* 表情选择器 */
    .cui-emoji-picker {
      border-radius: var(--cui-radius-medium) !important;
      box-shadow: var(--cui-shadow-medium) !important;
    }

    /* 更多操作菜单 */
    .cui-popover {
      border-radius: var(--cui-radius-small) !important;
      box-shadow: var(--cui-shadow-medium) !important;
    }

    /* 会话列表搜索框 */
    .cui-search-input {
      background-color: white !important;
      border: 1px solid hsl(0, 0%, 91%) !important;
      border-radius: var(--cui-radius-small) !important;
    }

    .cui-search-input:focus {
      border-color: var(--cui-primary-5) !important;
    }

    /* 隐藏环信默认头部（使用自定义头部） */
    .cui-chat-header {
      display: none !important;
    }

    /* 调整消息容器高度以适应自定义头部 */
    .cui-chat-message-list-container {
      height: 100% !important;
    }
  `,
}

export type EasemobTheme = typeof easemobTheme
