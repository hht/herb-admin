import {
  fetchCustomServerHistory,
  convertServerMsgToWebSdk,
} from "~/services/chat-history"

// ---------------------------------------------------------------------------
// Types (inline, 避免依赖 UIKit 内部类型)
// ---------------------------------------------------------------------------

interface GetHistoryMessagesOptions {
  targetId: string
  pageSize: number
  cursor: number | string | null
  chatType: "singleChat" | "groupChat" | "chatRoom"
  searchDirection: "up" | "down"
}

interface HistoryMessagesResult {
  messages: Record<string, unknown>[]
  isLast?: boolean
}

interface PatchableClient {
  getHistoryMessages: (
    options: GetHistoryMessagesOptions
  ) => Promise<HistoryMessagesResult>
  context?: { userId?: string }
  user?: string
  userId?: string
}

interface MessageStoreShape {
  message: Record<string, Record<string, Array<Record<string, unknown>>>>
}

interface RootStoreShape {
  client: PatchableClient
  messageStore: MessageStoreShape
}

// ---------------------------------------------------------------------------
// 状态追踪
// ---------------------------------------------------------------------------

/**
 * 追踪每个会话从自建服务器拉取的最早消息时间戳，
 * 用于下一次请求的 endTime，实现向前翻页。
 */
const customServerCursors = new Map<string, number>()

/**
 * 追踪已经从自建服务器拉完所有消息的会话，
 * 避免重复请求。
 */
const exhaustedConversations = new Set<string>()

// ---------------------------------------------------------------------------
// 猴子补丁
// ---------------------------------------------------------------------------

export function patchGetHistoryMessages(rootStore: RootStoreShape) {
  const client = rootStore.client
  if (!client?.getHistoryMessages) {
    console.warn("[CustomHistoryBridge] client.getHistoryMessages not found, skip patching")
    return
  }

  // 避免重复 patch
  if ((client as unknown as Record<string, boolean>).__customHistoryPatched) {
    return
  }

  const originalGetHistoryMessages = client.getHistoryMessages.bind(client)

  client.getHistoryMessages = async (
    options: GetHistoryMessagesOptions
  ): Promise<HistoryMessagesResult> => {
    // 1. 先调原始方法（环信服务器）
    let result: HistoryMessagesResult
    try {
      result = await originalGetHistoryMessages(options)
    } catch (err) {
      console.warn("[CustomHistoryBridge] original getHistoryMessages failed:", err)
      result = { messages: [] }
    }

    // 2. 环信还有消息 → 正常返回
    if (result.messages && result.messages.length > 0) {
      return result
    }

    // 3. 只处理群聊 + 向上翻页
    if (options.chatType !== "groupChat" || options.searchDirection !== "up") {
      return result
    }

    // 4. 已拉完 → 直接返回空
    const conversationKey = `${options.chatType}_${options.targetId}`
    if (exhaustedConversations.has(conversationKey)) {
      return result
    }

    // 5. 降级到自建服务器
    try {
      const currentUserId = getCurrentUserId(client)

      // 计算 endTime: 取当前会话最早消息的 time，或取已记录的游标
      let endTime = customServerCursors.get(conversationKey)

      if (!endTime) {
        const existingMsgs =
          rootStore.messageStore?.message?.groupChat?.[options.targetId] || []
        if (existingMsgs.length > 0) {
          // 找最早消息的时间戳
          const earliest = existingMsgs.reduce<Record<string, unknown>>(
            (min, msg) => {
              const minTime = typeof min.time === "number" ? min.time : Infinity
              const msgTime = typeof msg.time === "number" ? msg.time : Infinity
              return msgTime < minTime ? msg : min
            },
            existingMsgs[0]
          )
          endTime = typeof earliest.time === "number" ? earliest.time : undefined
        }
      }

      console.log(
        `[CustomHistoryBridge] Fallback to custom server for ${options.targetId}`,
        { endTime, pageSize: options.pageSize }
      )

      const pageResult = await fetchCustomServerHistory({
        groupId: options.targetId,
        pageNum: 1,
        pageSize: options.pageSize || 20,
        ...(endTime != null ? { endTime } : {}),
      })

      if (!pageResult.record || pageResult.record.length === 0) {
        // 自建服务器也没有更多消息了
        exhaustedConversations.add(conversationKey)
        console.log(`[CustomHistoryBridge] No more messages from custom server for ${options.targetId}`)
        return result
      }

      // 转换格式
      const convertedMsgs = pageResult.record.map((msg) =>
        convertServerMsgToWebSdk(msg, currentUserId)
      )

      // 更新游标：取这批消息中最早的时间戳
      const earliestTime = pageResult.record.reduce(
        (min, msg) => Math.min(min, msg.msgTime),
        Infinity
      )
      if (earliestTime < Infinity) {
        customServerCursors.set(conversationKey, earliestTime)
      }

      // 如果返回数量小于请求数量，说明到底了
      if (pageResult.record.length < (options.pageSize || 20)) {
        exhaustedConversations.add(conversationKey)
      }

      console.log(
        `[CustomHistoryBridge] Got ${convertedMsgs.length} messages from custom server`
      )

      return { messages: convertedMsgs, isLast: convertedMsgs.length === 0 }
    } catch (err) {
      console.error("[CustomHistoryBridge] Custom server fetch failed:", err)
      // 失败不阻塞，返回原始空结果
      return result
    }
  }

  ;(client as unknown as Record<string, boolean>).__customHistoryPatched = true
  console.log("[CustomHistoryBridge] getHistoryMessages patched successfully")
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCurrentUserId(client: PatchableClient): string {
  return (
    client.context?.userId ||
    client.user ||
    client.userId ||
    ""
  )
}

/**
 * 重置某个会话的自建服务器游标（用于调试/强制重新拉取）
 */
export function resetCustomHistoryCursor(
  chatType: string,
  conversationId: string
) {
  const key = `${chatType}_${conversationId}`
  customServerCursors.delete(key)
  exhaustedConversations.delete(key)
}

/**
 * 重置所有自建服务器游标
 */
export function resetAllCustomHistoryCursors() {
  customServerCursors.clear()
  exhaustedConversations.clear()
}
