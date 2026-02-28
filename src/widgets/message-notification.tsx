import { useClient, rootStore } from "easemob-chat-uikit"
import { useEffect, useRef } from "react"
import { NotificationPlugin } from "tdesign-react"

/**
 * 获取消息发送者的显示名称。
 * 优先从 UIKit 的 appUsersInfo 中查找 nickname，否则降级使用 from 字段。
 */
const getSenderName = (from: string | undefined): string => {
    if (!from) return "未知用户"
    try {
        const appUsersInfo = rootStore.addressStore.appUsersInfo as unknown as Record<
            string,
            { nickname?: string }
        >
        const nickname = appUsersInfo?.[from]?.nickname
        if (typeof nickname === "string" && nickname.trim() && nickname.trim() !== from) {
            return nickname.trim()
        }
    } catch {
        // ignore
    }
    return from
}

/**
 * 根据消息类型生成消息内容摘要。
 */
const getMessageSummary = (msg: Record<string, unknown>): string => {
    const type = typeof msg.type === "string" ? msg.type : ""
    switch (type) {
        case "txt": {
            const text = typeof msg.msg === "string" ? msg.msg : ""
            return text.length > 50 ? `${text.slice(0, 50)}…` : text || "[文本消息]"
        }
        case "img":
            return "[图片]"
        case "audio":
            return "[语音]"
        case "video":
            return "[视频]"
        case "file":
            return "[文件]"
        case "custom": {
            const ext = msg.ext && typeof msg.ext === "object" ? msg.ext as Record<string, unknown> : {}
            const title = typeof ext.title === "string" ? ext.title : ""
            if (title) return title
            const customEvent = typeof msg.customEvent === "string" ? msg.customEvent : ""
            if (customEvent) return customEvent
            return "[自定义消息]"
        }
        default:
            return "[新消息]"
    }
}

/** 防抖间隔 (ms) — 在此时间窗口内多条消息只弹一次通知 */
const DEBOUNCE_MS = 2000

/**
 * 全局消息通知监听器。
 *
 * 挂载在 UIKitProvider 内部，通过 useClient() 拿到环信 IM client，
 * 注册 addEventHandler 监听：
 * 1. 所有类型的新消息 — 弹窗 + 声音提醒
 * 2. 群组/聊天室事件 — 被邀请或直接加入新群组时提醒
 */
export const MessageNotificationListener = () => {
    const client = useClient()
    const lastNotifyRef = useRef(0)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    useEffect(() => {
        // 预加载音频
        try {
            audioRef.current = new Audio("/notification.wav")
            audioRef.current.volume = 0.6
        } catch {
            // audio not supported
        }
    }, [])

    useEffect(() => {
        if (!client) return

        const typedClient = client as unknown as {
            user?: string
            userId?: string
            context?: { userId?: string }
            addEventHandler?: (
                id: string,
                handler: Record<string, (msg: Record<string, unknown>) => void>
            ) => void
            removeEventHandler?: (id: string) => void
        }

        if (!typedClient.addEventHandler) return

        const getCurrentUserId = (): string => {
            const fromContext =
                typeof typedClient?.context?.userId === "string"
                    ? typedClient.context.userId.trim()
                    : ""
            if (fromContext) return fromContext
            const fromUser =
                typeof typedClient?.user === "string" ? typedClient.user.trim() : ""
            if (fromUser) return fromUser
            const fromUserId =
                typeof typedClient?.userId === "string" ? typedClient.userId.trim() : ""
            if (fromUserId) return fromUserId
            return ""
        }

        /** 播放提示音 */
        const playSound = () => {
            try {
                if (audioRef.current) {
                    audioRef.current.currentTime = 0
                    audioRef.current.play().catch(() => {
                        // 浏览器可能阻止自动播放（需要用户先交互过页面）
                    })
                }
            } catch {
                // ignore
            }
        }

        /** 显示通知（带防抖） */
        const showNotification = (title: string, content: string) => {
            const now = Date.now()
            if (now - lastNotifyRef.current < DEBOUNCE_MS) return
            lastNotifyRef.current = now

            playSound()

            NotificationPlugin.info({
                title,
                content,
                duration: 5000,
                closeBtn: true,
                placement: "top-right",
            })
        }

        /** 处理新消息 */
        const handleIncomingMessage = (msg: Record<string, unknown>) => {
            const from = typeof msg.from === "string" ? msg.from : ""
            const selfId = getCurrentUserId()

            // 不提醒自己发的消息
            if (selfId && from === selfId) return

            const senderName = getSenderName(from)
            const summary = getMessageSummary(msg)

            showNotification(`${senderName} 发来消息`, summary)
        }

        /** 处理群组事件（被邀请加入、被直接加入新群组） */
        const handleGroupEvent = (event: Record<string, unknown>) => {
            const operation = typeof event.operation === "string" ? event.operation : ""
            const groupName =
                (typeof event.name === "string" && event.name.trim()) ||
                (typeof event.groupName === "string" && event.groupName.trim()) ||
                ""

            // directJoined — 被管理员直接加入群组（无需确认）
            // inviteToJoin — 收到群组邀请
            if (operation === "directJoined") {
                const displayName = groupName || "新群组"
                showNotification("已加入新群组", `你已被加入「${displayName}」`)
            } else if (operation === "inviteToJoin") {
                const from = typeof event.from === "string" ? event.from : ""
                const inviterName = from ? getSenderName(from) : "某人"
                const displayName = groupName || "一个群组"
                showNotification("群组邀请", `${inviterName} 邀请你加入「${displayName}」`)
            }
        }

        typedClient.addEventHandler("herb_notification_handler", {
            // 新消息监听
            onTextMessage: handleIncomingMessage,
            onImageMessage: handleIncomingMessage,
            onAudioMessage: handleIncomingMessage,
            onVideoMessage: handleIncomingMessage,
            onFileMessage: handleIncomingMessage,
            onCustomMessage: handleIncomingMessage,
            // 群组事件监听（加入新房间）
            onGroupEvent: handleGroupEvent,
        })

        return () => {
            typedClient.removeEventHandler?.("herb_notification_handler")
        }
    }, [client])

    return null
}
