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
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { ArticleIcon, CalendarIcon, UserAddIcon } from "tdesign-icons-react"
import {
  ChatSidebar,
  type ConsultationDrawerSection,
  type SidebarTab,
} from "~/components/chat-sidebar"
import {
  OrderCustomMessage,
} from "~/components/chat/order-custom-message"
import { isOrderCustomMessage } from "~/components/chat/order-custom-message-utils"
import { cn } from "~/libs/utils"
import { fetchChatUserProfilesByUserIds } from "~/services/chat-user-profiles"
import { useOrderStore } from "~/stores/order-store"

type ChatOperateItem = {
  label: string
  tab: SidebarTab
  icon: ReactNode
  consultationSection?: ConsultationDrawerSection
}

const CHAT_OPERATIONS: ChatOperateItem[] = [
  {
    label: "问卷",
    tab: "questionnaire",
    consultationSection: "questionnaire",
    icon: <ArticleIcon size="16px" />,
  },
  {
    label: "创建订单",
    tab: "orders",
    icon: <CalendarIcon size="16px" />,
  },
  {
    label: "问诊记录",
    tab: "qtn-records",
    icon: <ArticleIcon size="16px" />,
  },
  {
    label: "添加健康顾问/医生",
    tab: "add-advisor",
    icon: <UserAddIcon size="16px" />,
  },
]

const ChatWorkspace = () => {
  const client = useClient()
  const { currentConversation } = useConversationContext()
  const [activeTab, setActiveTab] = useState<SidebarTab | null>(null)
  const [consultationSection, setConsultationSection] =
    useState<ConsultationDrawerSection>("info")
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
      userInfoProvider: async (userIds) => {
        const profiles = await fetchChatUserProfilesByUserIds(userIds)
        return userIds.map((userId) => ({
          userId,
          nickname: profiles[userId.trim()]?.nickname ?? userId,
          avatarUrl: profiles[userId.trim()]?.avatarurl ?? undefined,
        }))
      },
    }),
    [client]
  )

  const isOperationActive = (operation: ChatOperateItem) => {
    if (operation.tab !== activeTab) return false
    if (operation.tab !== "questionnaire") return true
    return (
      operation.consultationSection === undefined ||
      operation.consultationSection === consultationSection
    )
  }

  const handleOperateClick = (operation: ChatOperateItem) => {
    if (operation.tab === "questionnaire") {
      const nextSection = operation.consultationSection ?? "info"

      if (activeTab !== "questionnaire") {
        setConsultationSection(nextSection)
        setActiveTab("questionnaire")
        return
      }

      if (consultationSection === nextSection) {
        setActiveTab(null)
        return
      }

      setConsultationSection(nextSection)
      return
    }

    if (activeTab === operation.tab) {
      setActiveTab(null)
      return
    }

    if (operation.tab === "orders") {
      useOrderStore.getState().reset()
    }
    setActiveTab(operation.tab)
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
          <div className="flex h-12 flex-shrink-0 items-start border-b border-[#e7e7e7] bg-white">
            <div className="flex items-start pl-10">
              {CHAT_OPERATIONS.map((operation) => {
                const active = isOperationActive(operation)
                return (
                  <button
                    key={`${operation.tab}-${operation.label}`}
                    type="button"
                    onClick={() => handleOperateClick(operation)}
                    aria-selected={active}
                    className={cn(
                      "bg-white p-2 transition-colors",
                      active
                        ? "border-b-[3px] border-brand"
                        : "border-b-[3px] border-transparent hover:border-neutral-950/10"
                    )}
                  >
                    <span className="flex items-center gap-2 rounded-[3px] bg-white px-2 py-[5px]">
                      <span
                        className={cn(
                          "inline-flex size-4 items-center justify-center",
                          active ? "text-brand" : "text-neutral-950"
                        )}
                      >
                        {operation.icon}
                      </span>
                      <span
                        className={cn(
                          "text-sm leading-[22px]",
                          active ? "text-brand" : "text-neutral-950/60"
                        )}
                      >
                        {operation.label}
                      </span>
                    </span>
                  </button>
                )
              })}
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
            consultationSection={consultationSection}
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
