import type { BaseMessageProps } from "easemob-chat-uikit"

type CustomMessageLike = NonNullable<BaseMessageProps["message"]> & {
  type?: string
  ext?: unknown
  customExts?: unknown
  customEvent?: unknown
}

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {}

const getString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return undefined
}

const getNumber = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "number" && !Number.isNaN(value)) return value
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value)
      if (!Number.isNaN(parsed)) return parsed
    }
  }
  return undefined
}

export const isOrderCustomMessage = (message: CustomMessageLike) => {
  if (!message || message.type !== "custom") return false
  const customExts = toRecord(message.customExts)
  const ext = toRecord(message.ext)
  const orderNum = getString(customExts.orderNum, ext.orderNum)
  const orderId = getNumber(customExts.orderId, ext.orderId)
  const title = getString(customExts.title, ext.title, message.customEvent)
  if (orderNum || orderId) return true
  return Boolean(title && title.includes("订单"))
}

