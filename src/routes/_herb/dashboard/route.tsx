import { createFileRoute } from "@tanstack/react-router"

import {
  BaseMessage,
  Chat,
  ConversationList,
  useClient,
  useConversationContext,
  type BaseMessageProps,
  type CallKitProps,
  type MessageRenderContext,
} from "easemob-chat-uikit"
import { useEffect, useMemo, useState } from "react"
import { ChatSidebar, type SidebarTab } from "~/components/chat-sidebar"
import {
  OrderCustomMessage,
  isOrderCustomMessage,
} from "~/components/chat/order-custom-message"
import { cn } from "~/libs/utils"
import { useOrderStore } from "~/stores/order-store"

const TABS: { label: string; value: SidebarTab }[] = [
  { label: "问卷", value: "questionnaire" },
  { label: "创建订单", value: "orders" },
  { label: "预约问诊/回诊", value: "appointments" },
  { label: "预约记录", value: "appointment-records" },
  { label: "添加健康顾问/医生", value: "add-advisor" },
  { label: "病人信息", value: "patient-info" },
  { label: "终止/回绝", value: "terminate" },
]

const ChatWorkspace = () => {
  const client = useClient()
  const { currentConversation } = useConversationContext()
  const [activeTab, setActiveTab] = useState<SidebarTab | null>(null)
  const hasConversation = Boolean(currentConversation?.conversationId)

  useEffect(() => {
    if (!client) {
      return
    }
    console.log("客户端", client)
  }, [client])

  const callkitProps = useMemo<Partial<CallKitProps>>(
    () => ({
      chatClient: client ?? undefined,
      enableRealCall: true,
      enableRingtone: true,
      ringtoneLoop: true,
      onCallError: (error) => {
        console.error("CallKit error", error)
      },
      onCallStatusChanged: (status) => {
        console.info("CallKit status", status)
      },
      userInfoProvider: async (userIds) =>
        userIds.map((userId) => ({ userId, nickname: userId })),
    }),
    [client]
  )

  const handleTabClick = (tabValue: SidebarTab) => {
    if (activeTab === tabValue) {
      setActiveTab(null)
    } else {
      if (tabValue === "orders") {
        useOrderStore.getState().reset()
      }
      setActiveTab(tabValue)
    }
  }

  const messageListProps = useMemo(() => {
    const getString = (value: unknown) =>
      typeof value === "string" ? value : undefined
    const getNumber = (value: unknown) => {
      if (typeof value === "number" && !Number.isNaN(value)) return value
      if (typeof value === "string" && value.trim()) {
        const parsed = Number(value)
        return Number.isNaN(parsed) ? undefined : parsed
      }
      return undefined
    }

    const renderCustomMessage = ({
      message,
      style,
      messageProps,
    }: MessageRenderContext) => {
      if (message.type !== "custom") return null
      const baseMessage = message as NonNullable<BaseMessageProps["message"]>
      if (isOrderCustomMessage(baseMessage)) {
        return (
          <OrderCustomMessage
            style={style}
            message={baseMessage}
            messageProps={messageProps ?? undefined}
          />
        )
      }
      const ext =
        typeof message.ext === "object" && message.ext ? message.ext : {}
      const title =
        getString(ext.title) ?? getString(message.customEvent) ?? "自定义消息"
      const orderNum = getString(ext.orderNum)
      const orderId = getNumber(ext.orderId)
      const status = getNumber(ext.status)
      const statusLabel = status === 1 ? "已创建" : status ? `状态${status}` : ""

      return (
        <div style={style}>
          <BaseMessage {...(messageProps ?? {})} message={baseMessage}>
            <div className="space-y-1 text-xs text-neutral-800">
              <div className="text-sm font-semibold text-neutral-950">
                {title}
              </div>
              {orderNum ? <div>订单编号：{orderNum}</div> : null}
              {orderId ? <div>订单ID：{orderId}</div> : null}
              {statusLabel ? (
                <div className="text-brand">{statusLabel}</div>
              ) : null}
            </div>
          </BaseMessage>
        </div>
      )
    }

    return {
      customRenderers: {
        custom: renderCustomMessage,
      },
    }
  }, [])

  return (
    <div className="flex h-full w-full">
      {/* 会话列表区域 - 360px 宽 */}
      <div className="w-[360px] border-r border-border bg-neutral-100">
        <ConversationList renderHeader={() => null} />
      </div>

      {/* 聊天区域 - 剩余空间 */}
      <div className="flex flex-1 flex-col bg-neutral-50">
        {/* 自定义聊天头部 */}
        {hasConversation ? (
          <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border bg-white px-4">
            {/* 中间选项卡 */}
            <div className="flex items-center gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => handleTabClick(tab.value)}
                  className={cn(
                    "rounded px-2 py-1 text-xs transition-colors",
                    activeTab === tab.value
                      ? "bg-brand-light text-brand"
                      : "text-neutral-950/60 hover:bg-neutral-950/5 hover:text-neutral-950/90"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* 聊天内容区域 */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1">
            <Chat
              useCallkit
              callkitProps={callkitProps}
              messageListProps={messageListProps}
            />
          </div>

          {/* 侧边栏 */}
          <ChatSidebar
            activeTab={activeTab}
            onClose={() => setActiveTab(null)}
          />
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute("/_herb/dashboard")({
  component: ChatWorkspace,
})
