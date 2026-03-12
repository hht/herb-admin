import { z } from "zod"
import { request } from "~/hooks/useRequest"

// ---------------------------------------------------------------------------
// Zod schemas – 自建服务器 IM 消息
// ---------------------------------------------------------------------------

const ImMessageVOSchema = z.object({
  id: z.number().optional(),
  msgId: z.string(),
  body: z.string(),        // JSON 字符串
  chatType: z.string(),
  ext: z.string().optional().nullable(),
  fromUser: z.string(),
  toUser: z.string().optional().nullable(),
  groupId: z.string().optional().nullable(),
  msgType: z.string(),     // txt / custom / img / file / audio / video
  msgTime: z.number(),     // 毫秒时间戳
  msgTimeStr: z.string().optional().nullable(),
  callId: z.string().optional().nullable(),
  createTime: z.string().optional().nullable(),
})

export type ImMessageVO = z.infer<typeof ImMessageVOSchema>

const PageResultSchema = z.object({
  pageNum: z.number(),
  pageSize: z.number(),
  pages: z.number(),
  total: z.number(),
  record: z.array(ImMessageVOSchema),
})

export type PageResult = z.infer<typeof PageResultSchema>

// ---------------------------------------------------------------------------
// API – 拉取自建服务器历史消息
// ---------------------------------------------------------------------------

export interface FetchHistoryParams {
  groupId: string
  pageNum?: number
  pageSize?: number
  endTime?: number   // ms 时间戳，用于向前翻页
  startTime?: number
}

export async function fetchCustomServerHistory(
  params: FetchHistoryParams
): Promise<PageResult> {
  const raw = await request<PageResult, FetchHistoryParams>(
    "/backend/msg/list",
    "GET",
    {
      groupId: params.groupId,
      pageNum: params.pageNum ?? 1,
      pageSize: params.pageSize ?? 20,
      ...(params.endTime != null ? { endTime: params.endTime } : {}),
      ...(params.startTime != null ? { startTime: params.startTime } : {}),
    }
  )
  return PageResultSchema.parse(raw)
}

// ---------------------------------------------------------------------------
// 消息格式转换 – ImMessageVO → Web SDK MessageBody
// ---------------------------------------------------------------------------

/**
 * 后端 chatType 映射到 Web SDK chatType
 *   "groupchat" → "groupChat"
 *   "chat"      → "singleChat"
 */
function mapChatType(serverChatType: string): "singleChat" | "groupChat" {
  if (serverChatType?.toLowerCase() === "groupchat") return "groupChat"
  return "singleChat"
}

/**
 * 安全解析 JSON 字符串，失败返回空对象
 */
function safeJsonParse(str: string | null | undefined): Record<string, unknown> {
  if (!str) return {}
  try {
    const parsed: unknown = JSON.parse(str)
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

/**
 * 将 ImMessageVO 转换为 Web SDK 可识别的消息格式
 *
 * Web SDK MessageBody 核心字段:
 * - id / mid: 消息 ID
 * - type: "txt" | "img" | "file" | "audio" | "video" | "custom" | "loc"
 * - msg: 文本内容 (txt 类型)
 * - url: 资源地址 (img/file/audio/video)
 * - chatType: "singleChat" | "groupChat"
 * - from / to: 发送者 / 接收者
 * - time: 毫秒时间戳
 * - bySelf: 是否自己发送
 * - status: "sent"
 * - ext: 扩展字段
 */
export function convertServerMsgToWebSdk(
  msg: ImMessageVO,
  currentUserId: string
): Record<string, unknown> {
  const body = safeJsonParse(msg.body)
  const ext = safeJsonParse(msg.ext)
  const chatType = mapChatType(msg.chatType)

  // 根据 msgType 提取消息体内容
  const base: Record<string, unknown> = {
    // 核心 ID 字段
    id: msg.msgId,
    mid: msg.msgId,

    // 消息类型
    type: msg.msgType || "txt",

    // 路由
    chatType,
    from: msg.fromUser,
    to: chatType === "groupChat" ? (msg.groupId ?? msg.toUser ?? "") : (msg.toUser ?? ""),

    // 时间
    time: msg.msgTime,

    // 方向
    bySelf: msg.fromUser === currentUserId,

    // 状态
    status: "sent",

    // 扩展字段
    ext,
  }

  // 按消息类型附加特定字段
  switch (msg.msgType) {
    case "txt":
      base.msg = body.msg ?? body.content ?? ""
      break

    case "img": {
      base.url = body.url ?? ""
      base.thumb = body.thumb ?? body.url ?? ""
      const imgSize = typeof body.size === "object" && body.size !== null
        ? (body.size as Record<string, unknown>)
        : null
      base.width = imgSize?.width ?? body.width
      base.height = imgSize?.height ?? body.height
      base.file_length = body.file_length ?? body.size
      break
    }

    case "audio":
      base.url = body.url ?? ""
      base.length = body.length ?? 0
      base.file_length = body.file_length
      break

    case "video":
      base.url = body.url ?? ""
      base.thumb = body.thumb ?? ""
      base.length = body.length ?? 0
      base.file_length = body.file_length
      break

    case "file":
      base.url = body.url ?? ""
      base.filename = body.filename ?? body.file_name ?? ""
      base.file_length = body.file_length
      break

    case "custom":
      base.customEvent = body.customEvent ?? body.event ?? ext.msgType ?? ""
      base.customExts = body.customExts ?? body.params ?? ext
      break

    default:
      // 兜底: 尝试保留原始 body 字段
      Object.assign(base, body)
      break
  }

  return base
}
