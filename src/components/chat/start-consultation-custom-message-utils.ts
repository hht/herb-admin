import type { BaseMessageProps } from "easemob-chat-uikit"

type CustomMessageLike = NonNullable<BaseMessageProps["message"]> & {
  type?: string
  customExts?: unknown
  body?: unknown
}

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {}

const getString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return undefined
}

const getCustomKey = (message: CustomMessageLike) => {
  const messageRecord = toRecord(message)
  const directExts = toRecord(messageRecord.customExts)
  const body = toRecord(messageRecord.body)
  const bodyExts = toRecord(body.customExts)

  return getString(
    bodyExts.custom_key,
    bodyExts.customKey,
    directExts.custom_key,
    directExts.customKey
  )
}

export const isStartConsultationCustomMessage = (message: CustomMessageLike) => {
  if (!message || message.type !== "custom") return false
  return getCustomKey(message) === "startConsultation"
}

