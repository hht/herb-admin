import { type CSSProperties } from "react"
import { BaseMessage, type BaseMessageProps } from "easemob-chat-uikit"
import { TimeIcon } from "tdesign-icons-react"

type CustomMessageLike = NonNullable<BaseMessageProps["message"]> & {
  type?: string
  ext?: unknown
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

const splitTokens = (value?: string) => {
  if (!value) return []
  return value
    .split(/[\s,，;；、/|]+/g)
    .map((item) => item.trim())
    .filter(Boolean)
}

const formatAge = (value: unknown) => {
  const age = getNumber(value)
  if (!age) return undefined
  return `${age}岁`
}

export const StartConsultationCustomMessage = ({
  message,
  messageProps,
  style,
  onViewQuestionnaire,
}: {
  message: CustomMessageLike
  messageProps?: BaseMessageProps
  style?: CSSProperties
  onViewQuestionnaire?: (consultationId?: number) => void
}) => {
  const ext = toRecord(message.ext)
  const userName = getString(ext.userName) ?? "-"
  const sex = getString(ext.sex)
  const ageLabel = formatAge(ext.age)
  const consultationId = getNumber(ext.consultationId)

  const symptomTokens = splitTokens(getString(ext.symptom))
  const illnessTokens = splitTokens(getString(ext.illness))

  const timeText = getString(ext.time)
  const title = getString(ext.title) ?? "开始问诊"
  const bottomText = timeText ? `${timeText} ${title}` : title

  return (
    <div style={style} className="inline-flex">
      <BaseMessage
        {...(messageProps ?? {})}
        message={message}
        arrow={false}
        bubbleType="primary"
        onClick={() => false}
        bubbleStyle={{
          background: "transparent",
          border: "none",
          boxShadow: "none",
          padding: 0,
          maxWidth: "none",
          width: "fit-content",
          display: "inline-block",
        }}
      >
        <div
          className="relative inline-flex items-end"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="absolute bottom-[8px] left-[-5px] h-0 w-0 border-y-[4px] border-y-transparent border-r-[5px] border-r-[#ECF9F1]" />
          <div className="rounded-[4px] bg-[#ECF9F1] px-4 py-2">
            <div className="flex w-[217px] flex-col gap-3">
              <div className="flex items-center gap-2 text-sm font-medium leading-[normal] text-[rgba(0,0,0,0.9)]">
                <span>{userName}</span>
                {sex ? <span>{sex}</span> : null}
                {ageLabel ? <span>{ageLabel}</span> : null}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-x-[10px] gap-y-1 text-[11px] leading-[normal]">
                  <span className="text-[rgba(0,0,0,0.4)]">主要症状</span>
                  {(symptomTokens.length ? symptomTokens : ["-"]).map(
                    (token, index) => (
                      <span
                        key={`symptom-${index}`}
                        className="text-[rgba(0,0,0,0.6)]"
                      >
                        {token}
                      </span>
                    )
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-[10px] gap-y-1 text-[11px] leading-[normal]">
                  <span className="text-[rgba(0,0,0,0.4)]">既往病史</span>
                  {(illnessTokens.length ? illnessTokens : ["-"]).map(
                    (token, index) => (
                      <span
                        key={`illness-${index}`}
                        className="text-[rgba(0,0,0,0.6)]"
                      >
                        {token}
                      </span>
                    )
                  )}
                </div>
              </div>

              <div className="flex w-[217px] items-center justify-between rounded-[3px] bg-white p-[6px]">
                <div className="flex items-center gap-1">
                  <TimeIcon size="12px" className="text-[#267347]" />
                  <span className="text-[10px] leading-[normal] text-[#267347]">
                    {bottomText}
                  </span>
                </div>
                <button
                  type="button"
                  className="text-[10px] leading-[normal] text-[#267347] underline [text-decoration-skip-ink:none]"
                  onClick={(event) => {
                    event.stopPropagation()
                    onViewQuestionnaire?.(consultationId)
                  }}
                >
                  查看问卷
                </button>
              </div>
            </div>
          </div>
        </div>
      </BaseMessage>
    </div>
  )
}
