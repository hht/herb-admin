import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { Dialog } from "tdesign-react"

import type { QtnQuestion } from "~/services/app-user-qtn"

import qtnViewSvg from "~/assets/figma/qtn-view.svg?raw"

const severityColors: Record<number, string> = {
  1: "#999999",
  2: "#2BA471",
  3: "#E37318",
  4: "#FF7B15",
  5: "#FF5F57",
}

const metricTags = ["偏高", "偏低", "异常", "偏多", "偏少", "偏大", "偏小"]

export const SvgIcon = ({
  svg,
  className,
}: {
  svg: string
  className?: string
}) => <span className={className} dangerouslySetInnerHTML={{ __html: svg }} />

export const TruncatedText = ({
  value,
  className,
}: {
  value: string
  className?: string
}) => {
  if (!value || value === "-") return <span className={className}>-</span>
  return (
    <span title={value} className={className}>
      {value}
    </span>
  )
}

export const ImageViewerDialog = ({
  visible,
  title,
  images,
  initialIndex,
  onClose,
}: {
  visible: boolean
  title: string
  images: string[]
  initialIndex?: number
  onClose: () => void
}) => {
  const [activeIndex, setActiveIndex] = useState(0)
  useEffect(() => {
    if (!visible) return
    const next = initialIndex ?? 0
    setActiveIndex(Math.max(0, Math.min(next, Math.max(0, images.length - 1))))
  }, [images.length, initialIndex, visible])

  const current = images[activeIndex]

  return (
    <Dialog
      header={title || "查看图片"}
      visible={visible}
      placement="center"
      closeOnOverlayClick
      style={{
        width: "auto",
        maxWidth: "80vw",
        maxHeight: "80vh",
        overflow: "auto",
      }}
      onClose={onClose}
      footer={null}
    >
      {current ? (
        <div className="flex flex-col items-center gap-4">
          <img
            src={current}
            alt=""
            className="max-h-[calc(80vh-220px)] max-w-full object-contain"
          />
          {images.length > 1 ? (
            <div className="flex max-w-full items-center gap-2 overflow-x-auto pb-1">
              {images.map((src, index) => {
                const isActive = index === activeIndex
                return (
                  <button
                    key={src}
                    type="button"
                    className={`flex size-16 items-center justify-center overflow-hidden rounded border ${
                      isActive ? "border-brand" : "border-[#e7e7e7]"
                    } bg-[#f3f3f3]`}
                    onClick={() => setActiveIndex(index)}
                  >
                    <img src={src} alt="" className="size-full object-contain" />
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
          暂无图片
        </div>
      )}
    </Dialog>
  )
}

const splitMetricValue = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed || trimmed === "-") return { text: "-", tag: "" }
  const tag = metricTags.find((item) => trimmed.includes(item)) ?? ""
  if (!tag) return { text: trimmed, tag: "" }
  const text = trimmed
    .replace(tag, "")
    .replace(/[()（）]/g, "")
    .replace(/[:：|]/g, " ")
    .trim()
  return { text: text || "-", tag }
}

const renderMetricValue = (value: string) => {
  if (!value || value === "-") return "-"
  const { text, tag } = splitMetricValue(value)
  if (!tag) return text
  return (
    <span className="flex items-center gap-2">
      <span>{text}</span>
      <span className="inline-flex items-center rounded-[3px] bg-[#d54941] px-2 text-[12px] leading-[20px] text-white">
        {tag}
      </span>
    </span>
  )
}

export const TableBlock = ({
  headers,
  rows,
  rowHeaders,
}: {
  headers: string[]
  rows: Array<Array<ReactNode>>
  rowHeaders?: ReactNode[]
}) => {
  return (
    <div className="overflow-hidden rounded border border-[#e7e7e7]">
      <table className="w-full table-fixed text-[14px] leading-[22px]">
        <thead>
          <tr className="bg-[#f3f3f3] text-[rgba(0,0,0,0.4)]">
            {rowHeaders ? <th className="w-[180px] px-4 py-2" /> : null}
            {headers.map((header, index) => {
              const needsBorder = rowHeaders || index > 0
              return (
                <th
                  key={`${header}-${index}`}
                  className={`px-4 py-2 text-left font-normal ${
                    needsBorder ? "border-l border-[#e7e7e7]" : ""
                  }`}
                >
                  {header}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-[#e7e7e7]">
              {rowHeaders ? (
                <td className="bg-[#f3f3f3] px-4 py-2 text-[rgba(0,0,0,0.4)]">
                  {rowHeaders[rowIndex]}
                </td>
              ) : null}
              {row.map((cell, cellIndex) => {
                const needsBorder = rowHeaders || cellIndex > 0
                return (
                  <td
                    key={cellIndex}
                    className={`min-h-[60px] px-4 py-2 align-top text-[rgba(0,0,0,0.9)] ${
                      needsBorder ? "border-l border-[#e7e7e7]" : ""
                    }`}
                  >
                    {cell}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {}

const normalizeSectionTitle = (value?: string | null) => {
  if (!value) return ""
  const trimmed = value.trim()
  if (!trimmed || trimmed === "选填项") return ""
  return trimmed
}

export const formatQuestionTitle = (question: QtnQuestion) => {
  const title = question.title?.trim() ?? ""
  const unit = question.unit?.trim() ?? ""
  if (!title) return "-"
  if (unit && !title.includes(unit)) {
    return `${title}（${unit}）`
  }
  return title
}

export const getQuestionKey = (question: QtnQuestion) => {
  if (typeof question.questionId === "number") {
    return `id:${question.questionId}`
  }
  return `title:${question.title ?? ""}`
}

export const buildSeverityLabelMap = (qtnMain?: unknown) => {
  const record = toRecord(qtnMain)
  const raw = record.symptomLevel
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const entries = Object.entries(raw as Record<string, unknown>)
    if (entries.length) {
      return entries.reduce<Record<number, string>>((acc, [key, value]) => {
        const parsedKey = Number(key)
        if (Number.isNaN(parsedKey)) return acc
        if (typeof value === "string" && value.trim()) {
          acc[parsedKey] = value.trim()
        }
        return acc
      }, {})
    }
  }
  return {
    1: "感觉正常",
    2: "偶尔感觉不舒服",
    3: "感觉严重",
    4: "感觉很严重",
    5: "感觉非常严重",
  }
}

export const buildQuestionSections = (qtnMain?: unknown) => {
  const record = toRecord(qtnMain)
  const steps = Array.isArray(record.list) ? record.list : []
  const sections: Array<{
    key: string
    label: string
    questions: QtnQuestion[]
  }> = []
  const buildSections = (
    list: QtnQuestion[],
    prefix: string,
    stepTitle?: string
  ) => {
    const sorted = [...list].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    const baseTitle = normalizeSectionTitle(stepTitle)
    let current = {
      key: baseTitle ? baseTitle : `${prefix}-0`,
      label: baseTitle,
      questions: [] as QtnQuestion[],
    }
    let index = 1
    sorted.forEach((question) => {
      if (question.type === 10) {
        if (current.questions.length) {
          sections.push(current)
        }
        const nextTitle = normalizeSectionTitle(question.title ?? "")
        const keyBase = baseTitle ? `${baseTitle}-${nextTitle}` : nextTitle
        current = {
          key: keyBase || `${prefix}-${index}`,
          label: nextTitle,
          questions: [],
        }
        index += 1
        return
      }
      current.questions.push(question)
    })
    if (current.questions.length) {
      sections.push(current)
    }
  }

  if (steps.length) {
    steps.forEach((step, stepIndex) => {
      const stepRecord = toRecord(step)
      const stepQuestions =
        (Array.isArray(stepRecord.questions) &&
          (stepRecord.questions as QtnQuestion[])) ||
        (Array.isArray(stepRecord.questionList) &&
          (stepRecord.questionList as QtnQuestion[])) ||
        (Array.isArray(stepRecord.answerList) &&
          (stepRecord.answerList as QtnQuestion[])) ||
        (Array.isArray(stepRecord.answers) &&
          (stepRecord.answers as QtnQuestion[])) ||
        (Array.isArray(stepRecord.answerVOList) &&
          (stepRecord.answerVOList as QtnQuestion[])) ||
        (Array.isArray(stepRecord.qtnAnswerList) &&
          (stepRecord.qtnAnswerList as QtnQuestion[])) ||
        (Array.isArray(stepRecord.qtnAnswerVOS) &&
          (stepRecord.qtnAnswerVOS as QtnQuestion[])) ||
        []
      if (!stepQuestions.length) return
      buildSections(stepQuestions, `step-${stepIndex}`, stepRecord.title as string)
    })
    return sections
  }

  const list =
    record.questions ??
    record.questionList ??
    record.answerList ??
    record.answers ??
    record.answerVos ??
    record.answerVOList ??
    record.qtnAnswerList ??
    record.qtnAnswerVOS
  if (Array.isArray(list) && list.length) {
    buildSections(list as QtnQuestion[], "default")
  }
  return sections
}

const normalizeAnswer = (value?: string | null) => {
  if (!value) return "-"
  const trimmed = String(value).trim()
  if (!trimmed) return "-"
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean).join("、") || "-"
      }
      if (typeof parsed === "object" && parsed) {
        return JSON.stringify(parsed)
      }
    } catch {
      return trimmed
    }
  }
  return trimmed
}

const decodeAnswer = (answer: string) => {
  if (!answer) return []
  const trimmed = String(answer).trim()
  if (!trimmed) return []
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (Array.isArray(parsed)) {
        return parsed.flatMap((item) => {
          if (typeof item === "string" || typeof item === "number") {
            return [{ optionId: String(item), ext: undefined }]
          }
          if (item && typeof item === "object") {
            const record = item as Record<string, unknown>
            const optionId = record.optionId ?? record.id ?? record.value
            if (typeof optionId === "string" || typeof optionId === "number") {
              const ext = record.ext ?? record.level ?? record.severity
              return [
                {
                  optionId: String(optionId),
                  ext:
                    typeof ext === "string" || typeof ext === "number"
                      ? String(ext)
                      : undefined,
                },
              ]
            }
          }
          return []
        })
      }
    } catch {
      return []
    }
  }
  return trimmed
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [optionId, ext] = item.split(":")
      return { optionId, ext }
    })
}

const parseAnswerImages = (answer?: string | null) => {
  if (!answer) return []
  const trimmed = String(answer).trim()
  if (!trimmed) return []
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as string[]
      return Array.isArray(parsed) ? parsed.filter(Boolean) : []
    } catch {
      return []
    }
  }
  if (trimmed.includes("|")) {
    return trimmed
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean)
  }
  if (trimmed.includes(",")) {
    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return [trimmed]
}

const parseRichAnswer = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed.startsWith("{")) return null
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>
    const text =
      typeof parsed.text === "string"
        ? parsed.text
        : typeof parsed.content === "string"
          ? parsed.content
          : typeof parsed.desc === "string"
            ? parsed.desc
            : undefined
    const imagesRaw =
      parsed.images ??
      parsed.imgs ??
      parsed.files ??
      parsed.urls ??
      parsed.urlList
    const images = Array.isArray(imagesRaw)
      ? imagesRaw.filter((item): item is string => typeof item === "string")
      : typeof imagesRaw === "string"
        ? parseAnswerImages(imagesRaw)
        : []
    return { text, images }
  } catch {
    return null
  }
}

const getOptionLabel = (question: QtnQuestion, value: string) => {
  const normalized = value.trim()
  if (!normalized) return "-"
  const optionById = question.options?.find(
    (option) => String(option.optionId) === normalized
  )
  const optionByLabel = question.options?.find(
    (option) => option.option === normalized
  )
  return optionById?.option ?? optionByLabel?.option ?? normalized
}

const renderTag = (label: string) => (
  <span className="inline-flex items-center rounded-[3px] border border-[#e7e7e7] bg-[#f3f3f3] px-2 py-0.5 text-[12px] leading-[20px] text-[rgba(0,0,0,0.6)]">
    {label}
  </span>
)

const renderSeverityTag = (
  label: string,
  level?: number,
  severityLabelMap?: Record<number, string>
) => {
  if (!level) return renderTag(label)
  const color = severityColors[level] ?? severityColors[1]
  const severityText = severityLabelMap?.[level]
  const text = severityText ? `${label} - ${severityText}` : label
  return (
    <span
      className="inline-flex items-center rounded-[3px] px-2 py-[2px] text-[12px] leading-[20px] text-white/90"
      style={{ backgroundColor: color }}
    >
      {text}
    </span>
  )
}

const renderImages = (images: string[], onClick?: (index: number) => void) => {
  if (!images.length) return "-"
  return (
    <div className="flex items-center gap-3">
      {images.slice(0, 3).map((src, index) => (
        <button
          type="button"
          key={src}
          className="flex size-[60px] shrink-0 items-center justify-center overflow-hidden rounded border border-[#e7e7e7] bg-[#f3f3f3]"
          onClick={() => onClick?.(index)}
        >
          <img
            src={src}
            alt=""
            className="size-[52px] max-h-full max-w-full object-contain"
          />
        </button>
      ))}
    </div>
  )
}

export const formatQuestionAnswer = (
  question?: QtnQuestion,
  options?: {
    severityLabelMap?: Record<number, string>
    onOpenImages?: (payload: {
      title: string
      images: string[]
      initialIndex?: number
    }) => void
  }
) => {
  if (!question) return "-"
  const rawAnswer = question.userAnswer ?? question.answer ?? question.other ?? ""
  const answer = String(rawAnswer ?? "")
  if (question.type === 1) {
    const normalized = normalizeAnswer(answer)
    return answer === "1" ? "是" : answer === "0" ? "否" : normalized
  }
  if (question.type === 9 || question.type === 3) {
    const label = getOptionLabel(question, answer)
    return label || normalizeAnswer(answer)
  }
  if (question.type === 4) {
    const label = getOptionLabel(question, answer)
    return label || normalizeAnswer(answer)
  }
  if (question.type === 5 || question.type === 6) {
    const selected = decodeAnswer(answer)
    if (!selected.length) return "-"
    if (question.type === 5) {
      const labels = selected.map((item) =>
        getOptionLabel(question, item.optionId)
      )
      return labels.join("、") || "-"
    }
    return (
      <div className="flex flex-col gap-2">
        {selected.map((item) => {
          const level = item.ext ? Number(item.ext) : undefined
          return (
            <div key={`${item.optionId}-${item.ext ?? ""}`}>
              {renderSeverityTag(
                getOptionLabel(question, item.optionId),
                Number.isNaN(level) ? undefined : level,
                options?.severityLabelMap
              )}
            </div>
          )
        })}
      </div>
    )
  }
  if (question.type === 7 || question.type === 8) {
    const rich = question.type === 7 ? parseRichAnswer(answer) : null
    const images = rich?.images?.length ? rich.images : parseAnswerImages(answer)
    if (!images.length && !rich?.text) {
      return question.type === 7 ? normalizeAnswer(answer) : "-"
    }
    const handleOpenImages = (initialIndex = 0) => {
      if (!images.length) return
      options?.onOpenImages?.({
        title: formatQuestionTitle(question),
        images,
        initialIndex,
      })
    }
    if (question.type === 7) {
      if (!images.length) {
        return rich?.text ?? normalizeAnswer(answer)
      }
      if (rich?.text) {
        return (
          <div className="space-y-1">
            <div className="whitespace-pre-wrap">{rich.text}</div>
            <button
              type="button"
              className="inline-flex items-center gap-2 text-[14px] leading-[22px] text-[#267347]"
              onClick={() => handleOpenImages(0)}
            >
              <SvgIcon svg={qtnViewSvg} className="inline-flex size-4" />
              查看图片
            </button>
          </div>
        )
      }
      return (
        <button
          type="button"
          className="inline-flex items-center gap-2 text-[14px] leading-[22px] text-[#267347]"
          onClick={() => handleOpenImages(0)}
        >
          <SvgIcon svg={qtnViewSvg} className="inline-flex size-4" />
          查看图片
        </button>
      )
    }
    return renderImages(images, handleOpenImages)
  }
  const normalized = normalizeAnswer(answer)
  return renderMetricValue(normalized)
}

export const useScrollTabs = (
  tabs: Array<{ key: string; label: string }>,
  options?: { scrollOffset?: number; activeOffset?: number }
) => {
  const scrollOffset = options?.scrollOffset ?? 72
  const activeOffset = options?.activeOffset ?? 88
  const containerRef = useRef<HTMLDivElement | null>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [activeKey, setActiveKey] = useState(tabs[0]?.key ?? "")
  const activeRef = useRef(activeKey)

  useEffect(() => {
    activeRef.current = activeKey
  }, [activeKey])

  const setSectionRef = useCallback((key: string) => {
    return (node: HTMLDivElement | null) => {
      sectionRefs.current[key] = node
    }
  }, [])

  const scrollTo = useCallback(
    (key: string) => {
      const container = containerRef.current
      const node = sectionRefs.current[key]
      if (!container || !node) return
      const top =
        node.getBoundingClientRect().top - container.getBoundingClientRect().top
      container.scrollTo({ top: container.scrollTop + top - scrollOffset, behavior: "smooth" })
      setActiveKey(key)
    },
    [scrollOffset]
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let raf = 0
    const update = () => {
      const containerTop = container.getBoundingClientRect().top
      let current = tabs[0]?.key ?? ""
      tabs.forEach((tab) => {
        const node = sectionRefs.current[tab.key]
        if (!node) return
        const top = node.getBoundingClientRect().top - containerTop
        if (top <= activeOffset) {
          current = tab.key
        }
      })
      if (current && current !== activeRef.current) {
        setActiveKey(current)
      }
    }
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(update)
    }
    container.addEventListener("scroll", onScroll)
    update()
    return () => {
      if (raf) cancelAnimationFrame(raf)
      container.removeEventListener("scroll", onScroll)
    }
  }, [activeOffset, tabs])

  return { containerRef, setSectionRef, activeKey, scrollTo }
}

