import dayjs from "dayjs"
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  Button,
  Checkbox,
  Drawer,
  Dialog,
  Loading,
  MessagePlugin,
  DialogPlugin,
  Radio,
  Select,
  Table,
} from "tdesign-react"
import { ChevronLeftIcon, CloseIcon } from "tdesign-icons-react"
import { shallow } from "zustand/shallow"

import { useRequest } from "~/hooks/useRequest"
import {
  getConsultationDetailById,
  listAppUserQtn,
  type ConsultationDetail,
  type QtnMain,
  type QtnQuestion,
  type QtnRecord,
  type QtnRecordPage,
} from "~/services/app-user-qtn"
import { buildSnapshot } from "~/libs/qtn-snapshot"
import {
  DEFAULT_QTN_PAGE,
  useQtnRecordsStore,
} from "~/stores/qtn-records-store"
import qtnUserBusinessSvg from "~/assets/figma/qtn-user-business.svg?raw"
import qtnInfoSvg from "~/assets/figma/qtn-info.svg?raw"
import qtnViewSvg from "~/assets/figma/qtn-view.svg?raw"

const MAX_COMPARE_COUNT = 3
const MAX_QTN_PAGE_SIZE = 100
const TAB_SCROLL_OFFSET = 72
const TAB_ACTIVE_OFFSET = 88

const formatDateTime = (value?: string | null) => {
  if (!value) return "-"
  const date = dayjs(value)
  return date.isValid() ? date.format("YYYY.MM.DD HH:mm") : "-"
}

const formatDate = (value?: string | null) => {
  if (!value) return "-"
  const date = dayjs(value)
  return date.isValid() ? date.format("YYYY.MM.DD") : "-"
}

const getText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value
    if (typeof value === "number" && !Number.isNaN(value)) return String(value)
  }
  return "-"
}

const statusMetaMap: Record<
  string,
  { label: string; color: string; dot: string }
> = {
  "0": { label: "待问诊", color: "#E37318", dot: "#E37318" },
  "1": { label: "已完成", color: "#2BA471", dot: "#2BA471" },
  "9": { label: "已取消", color: "#999999", dot: "#999999" },
}

const getRecordKey = (record: QtnRecord) => {
  const raw =
    record.consultationId ?? record.answerId ?? record.batchNo ?? undefined
  if (raw === null || typeof raw === "undefined") return ""
  return String(raw)
}

const severityColors: Record<number, string> = {
  1: "#999999",
  2: "#2BA471",
  3: "#E37318",
  4: "#FF7B15",
  5: "#FF5F57",
}

const renderImages = (images: string[], onClick?: () => void) => {
  if (!images.length) return "-"
  return (
    <div className="flex items-center gap-3">
      {images.slice(0, 3).map((src) => (
        <button
          type="button"
          key={src}
          className="flex size-[60px] items-center justify-center rounded border border-[#e7e7e7] bg-[#f3f3f3]"
          onClick={onClick}
        >
          <img src={src} alt="" className="size-[52px] object-contain" />
        </button>
      ))}
    </div>
  )
}

const TruncatedText = ({
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

const SvgIcon = ({
  svg,
  className,
}: {
  svg: string
  className?: string
}) => <span className={className} dangerouslySetInnerHTML={{ __html: svg }} />

const ImageViewerDialog = ({
  visible,
  title,
  images,
  onClose,
}: {
  visible: boolean
  title: string
  images: string[]
  onClose: () => void
}) => {
  const [activeIndex, setActiveIndex] = useState(0)
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

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {}

const normalizeSectionTitle = (value?: string | null) => {
  if (!value) return ""
  const trimmed = value.trim()
  if (!trimmed || trimmed === "选填项") return ""
  return trimmed
}

const formatQuestionTitle = (question: QtnQuestion) => {
  const title = question.title?.trim() ?? ""
  const unit = question.unit?.trim() ?? ""
  if (!title) return "-"
  if (unit && !title.includes(unit)) {
    return `${title}（${unit}）`
  }
  return title
}

const getQuestionKey = (question: QtnQuestion) => {
  if (typeof question.questionId === "number") {
    return `id:${question.questionId}`
  }
  return `title:${question.title ?? ""}`
}

const buildSeverityLabelMap = (qtnMain?: unknown) => {
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

const buildQuestionSections = (qtnMain?: unknown) => {
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

const resolveMainFromDetail = (detail?: ConsultationDetail | null) => {
  const detailRecord = toRecord(detail)
  const dataRecord = toRecord(detailRecord.data)
  const candidates = [
    detailRecord.qtnMainVO,
    detailRecord.qtnMainVo,
    detailRecord.qtnMain,
    detailRecord.questions ? detailRecord : null,
    toRecord(detailRecord.consultation).qtnMainVO,
    toRecord(detailRecord.consultation).qtnMain,
    dataRecord.qtnMainVO,
    dataRecord.qtnMainVo,
    dataRecord.qtnMain,
  ]
  return candidates.find((item) => item && typeof item === "object")
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
    const images =
      (Array.isArray(parsed.images) && parsed.images) ||
      (Array.isArray(parsed.imgs) && parsed.imgs) ||
      (Array.isArray(parsed.files) && parsed.files) ||
      (Array.isArray(parsed.fileList) && parsed.fileList) ||
      (Array.isArray(parsed.imagesList) && parsed.imagesList) ||
      []
    return {
      text,
      images: images.filter((item) => typeof item === "string"),
    }
  } catch {
    return null
  }
}

const parseTipsOptions = (tips?: string | null) => {
  if (!tips) return []
  return tips
    .split(",")
    .map((item) => item.trim())
    .map((item) => {
      const [key, label] = item.split(":")
      if (!key || !label) return null
      return { key: key.trim(), label: label.trim() }
    })
    .filter(Boolean) as Array<{ key: string; label: string }>
}

const getTipLabel = (tips: string | null | undefined, value: string) => {
  if (!tips) return undefined
  const options = parseTipsOptions(tips)
  const matched = options.find((item) => item.key === value)
  return matched?.label
}

const getOptionLabel = (question: QtnQuestion, value: string) => {
  const optionById = question.options?.find(
    (option) => String(option.optionId) === value
  )
  const optionByLabel = question.options?.find(
    (option) => option.option === value
  )
  return (
    optionById?.option ??
    optionByLabel?.option ??
    getTipLabel(question.tips1, value) ??
    value
  )
}

const decodeAnswer = (value: string) => {
  const trimmed = value.trim()
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

const formatQuestionAnswer = (
  question?: QtnQuestion,
  options?: {
    severityLabelMap?: Record<number, string>
    onOpenImages?: (payload: { title: string; images: string[] }) => void
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
    const handleOpenImages = () => {
      if (!images.length) return
      options?.onOpenImages?.({ title: formatQuestionTitle(question), images })
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
              onClick={handleOpenImages}
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
          onClick={handleOpenImages}
        >
          <SvgIcon svg={qtnViewSvg} className="inline-flex size-4" />
          查看图片
        </button>
      )
    }
    return renderImages(images, handleOpenImages)
  }
  const normalized = normalizeAnswer(answer)
  const display = renderMetricValue(normalized)
  return display
}

const metricTags = ["偏高", "偏低", "异常", "偏多", "偏少", "偏大", "偏小"]

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

const TableBlock = ({
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

const DiagnosisField = ({
  label,
  value,
}: {
  label: string
  value: string
}) => {
  const content = value || "-"
  const textColor =
    value && value.trim() ? "text-[#1a1a1a]" : "text-[rgba(0,0,0,0.4)]"
  return (
    <div className="space-y-2">
      <div className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
        {label}
      </div>
      <div
        className={`min-h-[124px] rounded-[3px] border border-[#dcdcdc] bg-white px-2 py-[5px] text-[14px] leading-[22px] ${textColor} whitespace-pre-wrap`}
      >
        {content}
      </div>
    </div>
  )
}

const useScrollTabs = (tabs: Array<{ key: string; label: string }>) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [activeKey, setActiveKey] = useState(tabs[0]?.key ?? "")
  const activeRef = useRef(activeKey)

  useEffect(() => {
    activeRef.current = activeKey
  }, [activeKey])

  const setSectionRef = useCallback(
    (key: string) => (node: HTMLDivElement | null) => {
      sectionRefs.current[key] = node
    },
    []
  )

  const scrollTo = useCallback((key: string) => {
    const container = containerRef.current
    const target = sectionRefs.current[key]
    if (!container || !target) return
    const containerTop = container.getBoundingClientRect().top
    const targetTop = target.getBoundingClientRect().top - containerTop
    const nextTop = Math.max(
      container.scrollTop + targetTop - TAB_SCROLL_OFFSET,
      0
    )
    container.scrollTo({ top: nextTop, behavior: "smooth" })
  }, [])

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
        if (top <= TAB_ACTIVE_OFFSET) {
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
  }, [tabs])

  return { containerRef, setSectionRef, activeKey, scrollTo }
}

const DetailView = ({
  record,
  detail,
  userName,
  onBack,
  onClose,
}: {
  record: QtnRecord
  detail: ConsultationDetail | null
  userName: string
  onBack: () => void
  onClose: () => void
}) => {
  const [imageViewer, setImageViewer] = useState<{
    visible: boolean
    title: string
    images: string[]
  }>({ visible: false, title: "", images: [] })
  const qtnMain = useMemo(
    () => resolveMainFromDetail(detail),
    [detail]
  )
  const snapshot = buildSnapshot(qtnMain as QtnMain, detail?.consultation)
  const questionSections = useMemo(
    () => buildQuestionSections(qtnMain),
    [qtnMain]
  )
  const severityLabelMap = useMemo(
    () => buildSeverityLabelMap(qtnMain),
    [qtnMain]
  )
  const consultation = (detail?.consultation ?? {}) as Record<string, unknown>
  const statusKey = getText(consultation.status)
  const statusMeta = statusMetaMap[statusKey] ?? {
    label: "-",
    color: "#999999",
    dot: "#999999",
  }
  const consultNo = getText(
    consultation.consultationNo,
    consultation.consultationNum,
    consultation.consultationId,
    record.consultationId,
    record.batchNo
  )
  const consultUserName = getText(
    consultation.userName,
    consultation.username,
    record.name,
    userName
  )
  const consultPatient = getText(
    consultation.patient,
    consultation.patientName,
    consultation.userName,
    record.name,
    userName
  )
  const consultCreateTime = formatDateTime(
    getText(consultation.createTime, record.createTime, record.createDate)
  )
  const consultTime = getText(
    consultation.consultationTime,
    consultation.qtnTime,
    consultation.visitTime,
    consultation.startTime
  )
  const consultDoctor = getText(
    consultation.doctorName,
    consultation.doctor,
    consultation.doctorUserName,
    consultation.advisorName
  )
  const consultServiceType = getText(
    consultation.serviceType,
    consultation.serviceName,
    consultation.service
  )
  const tabs = useMemo(
    () => [
      { key: "info", label: "问诊信息" },
      { key: "questionnaire", label: "患者问卷" },
      { key: "diagnosis", label: "诊断报告" },
    ],
    []
  )
  const { containerRef, setSectionRef, activeKey, scrollTo } = useScrollTabs(tabs)
  const openImages = useCallback((payload: { title: string; images: string[] }) => {
    if (!payload.images.length) return
    setImageViewer({ visible: true, title: payload.title, images: payload.images })
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-[#e7e7e7] px-4 py-4">
        <button
          type="button"
          className="flex items-center gap-2 text-[14px] leading-[22px] text-[rgba(0,0,0,0.6)] hover:text-[rgba(0,0,0,0.9)]"
          onClick={onBack}
        >
          <ChevronLeftIcon size={16} />
          返回
        </button>
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded hover:bg-[#f3f3f3]"
          onClick={onClose}
        >
          <CloseIcon size={16} />
        </button>
      </div>
      <div className="border-b border-[#e7e7e7] bg-white px-12">
        <div className="flex h-12 items-center gap-6 text-[14px] leading-[22px]">
          {tabs.map((tab) => {
            const isActive = tab.key === activeKey
            return (
              <button
                key={tab.key}
                type="button"
                className={`relative flex h-full items-center ${
                  isActive ? "text-brand" : "text-[rgba(0,0,0,0.6)]"
                }`}
                onClick={() => scrollTo(tab.key)}
              >
                {tab.label}
                <span
                  className={`absolute bottom-0 left-0 h-[2px] w-full rounded-full ${
                    isActive ? "bg-brand" : "bg-transparent"
                  }`}
                />
              </button>
            )
          })}
        </div>
      </div>
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto px-12 pb-8 pt-6"
      >
        <div ref={setSectionRef("info")} className="space-y-6">
          <div className="flex items-center gap-4">
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#ecf9f1]">
              <SvgIcon svg={qtnInfoSvg} className="inline-flex size-4" />
            </span>
            <span className="text-[20px] font-semibold leading-[28px] text-[rgba(0,0,0,0.9)]">
              问诊信息
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-8">
            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <span className="w-[90px] text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                  问诊编号
                </span>
                <TruncatedText
                  value={consultNo}
                  className="block max-w-[240px] truncate text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]"
                />
              </div>
              <div className="flex items-center gap-6">
                <span className="w-[90px] text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                  用户姓名
                </span>
                <span className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                  {consultUserName}
                </span>
              </div>
              <div className="flex items-center gap-6">
                <span className="w-[90px] text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                  病患姓名
                </span>
                <span className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                  {consultPatient}
                </span>
              </div>
              <div className="flex items-center gap-6">
                <span className="w-[90px] text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                  问诊状态
                </span>
                <span className="flex items-center gap-2 text-[14px] leading-[22px]">
                  <span
                    className="inline-flex size-[6px] rounded-full"
                    style={{ backgroundColor: statusMeta.dot }}
                  />
                  <span style={{ color: statusMeta.color }}>
                    {statusMeta.label}
                  </span>
                </span>
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <span className="w-[90px] text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                  创建时间
                </span>
                <span className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                  {consultCreateTime}
                </span>
              </div>
              <div className="flex items-center gap-6">
                <span className="w-[90px] text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                  问诊时间
                </span>
                <span className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                  {consultTime}
                </span>
              </div>
              <div className="flex items-center gap-6">
                <span className="w-[90px] text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                  问诊医生
                </span>
                <span className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                  {consultDoctor}
                </span>
              </div>
              <div className="flex items-center gap-6">
                <span className="w-[90px] text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                  服务类型
                </span>
                <span className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                  {consultServiceType}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div ref={setSectionRef("questionnaire")} className="mt-6 space-y-5">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#ecf9f1]">
              <SvgIcon svg={qtnUserBusinessSvg} className="inline-flex size-4" />
            </span>
            <span className="text-[20px] leading-[28px] text-[rgba(0,0,0,0.9)]">
              患者问卷
            </span>
          </div>
          {questionSections.length ? (
            questionSections.map((section) => {
              if (!section.questions.length) return null
              const headers = section.questions.map((question) =>
                formatQuestionTitle(question)
              )
              const row = section.questions.map((question) =>
                formatQuestionAnswer(question, { severityLabelMap, onOpenImages: openImages })
              )
              return (
                <TableBlock
                  key={`${section.key}-${headers.length}`}
                  headers={headers}
                  rows={[row]}
                />
              )
            })
          ) : (
            <div className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
              暂无问卷数据
            </div>
          )}
        </div>

        <div ref={setSectionRef("diagnosis")} className="mt-8 space-y-4">
          <div className="flex items-center gap-2 text-[14px] font-semibold leading-[22px] text-[#267347]">
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-[#ecf9f1] text-[12px] font-semibold text-[#267347]">
              ✓
            </span>
            诊断报告
          </div>
          <div className="space-y-6">
            <DiagnosisField label="健康顾问备注" value={snapshot.diagnosis[0]} />
            <DiagnosisField label="医生诊断" value={snapshot.diagnosis[1]} />
            <DiagnosisField label="治疗建议" value={snapshot.diagnosis[2]} />
          </div>
        </div>
      </div>
      <ImageViewerDialog
        key={`${imageViewer.visible}-${imageViewer.images.join("|")}`}
        visible={imageViewer.visible}
        title={imageViewer.title}
        images={imageViewer.images}
        onClose={() =>
          setImageViewer((prev) => ({ ...prev, visible: false, images: [] }))
        }
      />
    </div>
  )
}

const CompareView = ({
  records,
  details,
  loading,
  onBack,
  onClose,
}: {
  records: QtnRecord[]
  details: ConsultationDetail[]
  loading: boolean
  onBack: () => void
  onClose: () => void
}) => {
  const [imageViewer, setImageViewer] = useState<{
    visible: boolean
    title: string
    images: string[]
  }>({ visible: false, title: "", images: [] })
  const mains = useMemo(
    () => details.map((detail) => resolveMainFromDetail(detail)),
    [details]
  )
  const snapshots = details.map((detail, index) =>
    buildSnapshot(mains[index] as QtnMain, detail.consultation)
  )
  const sectionList = useMemo(
    () => mains.map((main) => buildQuestionSections(main)),
    [mains]
  )
  const mergedSections = useMemo(() => {
    const order: string[] = []
    const map = new Map<
      string,
      { key: string; label: string; questions: QtnQuestion[]; keys: Set<string> }
    >()
    sectionList.forEach((sections) => {
      sections.forEach((section) => {
        const key = section.key
        if (!map.has(key)) {
          map.set(key, {
            key,
            label: section.label,
            questions: [],
            keys: new Set(),
          })
          order.push(key)
        }
        const entry = map.get(key)
        if (!entry) return
        section.questions.forEach((question) => {
          const questionKey = getQuestionKey(question)
          if (entry.keys.has(questionKey)) return
          entry.keys.add(questionKey)
          entry.questions.push(question)
        })
      })
    })
    return order
      .map((key) => map.get(key))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
  }, [sectionList])
  const questionMaps = useMemo(
    () =>
      sectionList.map((sections) => {
        const map = new Map<string, Map<string, QtnQuestion>>()
        sections.forEach((section) => {
          const questionMap = new Map<string, QtnQuestion>()
          section.questions.forEach((question) => {
            questionMap.set(getQuestionKey(question), question)
          })
          map.set(section.key, questionMap)
        })
        return map
      }),
    [sectionList]
  )
  const severityLabelMaps = useMemo(
    () => mains.map((main) => buildSeverityLabelMap(main)),
    [mains]
  )
  const openImages = useCallback((payload: { title: string; images: string[] }) => {
    if (!payload.images.length) return
    setImageViewer({ visible: true, title: payload.title, images: payload.images })
  }, [])
  const rowHeaders = records.map((record) => (
    <div className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
      <TruncatedText
        value={record.batchNo ?? "-"}
        className="block max-w-[150px] truncate"
      />
      （{formatDate(record.createTime ?? record.createDate)}）
    </div>
  ))

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-[#e7e7e7] px-4 py-4">
        <button
          type="button"
          className="flex items-center gap-2 text-[14px] leading-[22px] text-[rgba(0,0,0,0.6)] hover:text-[rgba(0,0,0,0.9)]"
          onClick={onBack}
        >
          <ChevronLeftIcon size={16} />
          返回
        </button>
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded hover:bg-[#f3f3f3]"
          onClick={onClose}
        >
          <CloseIcon size={16} />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-12 pb-8 pt-10">
        <div className="space-y-5">
          {loading ? (
            <div className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
              正在加载问卷数据...
            </div>
          ) : mergedSections.length ? (
            mergedSections.map((section) => {
              if (!section.questions.length) return null
              const headers = section.questions.map((question) =>
                formatQuestionTitle(question)
              )
              const rows = details.map((_, detailIndex) => {
                const questionMap = questionMaps[detailIndex]?.get(section.key)
                const severityLabelMap = severityLabelMaps[detailIndex]
                return section.questions.map((question) =>
                  formatQuestionAnswer(questionMap?.get(getQuestionKey(question)), {
                    severityLabelMap,
                    onOpenImages: openImages,
                  })
                )
              })
              return (
                <TableBlock
                  key={`${section.key}-${headers.length}`}
                  headers={headers}
                  rows={rows}
                  rowHeaders={rowHeaders}
                />
              )
            })
          ) : mains.some(Boolean) ? (
            <div className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
              暂无问卷数据
            </div>
          ) : (
            <div className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
              问卷数据解析失败
            </div>
          )}
          <div className="mt-2 space-y-4">
            <div className="flex items-center gap-2 text-[14px] font-semibold leading-[22px] text-[#267347]">
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-[#ecf9f1] text-[12px] font-semibold text-[#267347]">
                ✓
              </span>
              诊断报告
            </div>
            <TableBlock
              headers={["健康顾问备注", "医生诊断", "治疗建议"]}
              rows={snapshots.map((snapshot) => snapshot.diagnosis)}
              rowHeaders={rowHeaders}
            />
          </div>
        </div>
      </div>
      <ImageViewerDialog
        key={`${imageViewer.visible}-${imageViewer.images.join("|")}`}
        visible={imageViewer.visible}
        title={imageViewer.title}
        images={imageViewer.images}
        onClose={() =>
          setImageViewer((prev) => ({ ...prev, visible: false, images: [] }))
        }
      />
    </div>
  )
}

export interface QtnRecordsDrawerProps {
  userId?: number
  userName?: string
  visible: boolean
  onClose: () => void
}

export const QtnRecordsDrawer = ({
  userId,
  userName,
  visible,
  onClose,
}: QtnRecordsDrawerProps) => {
  const [compareLoading, setCompareLoading] = useState(false)
  const {
    page,
    mode,
    view,
    selected,
    activeRecord,
    detailData,
    compareData,
    symptomFilter,
    setState,
    reset,
  } = useQtnRecordsStore(
    (state) => ({
      page: state.page,
      mode: state.mode,
      view: state.view,
      selected: state.selected,
      activeRecord: state.activeRecord,
      detailData: state.detailData,
      compareData: state.compareData,
      symptomFilter: state.symptomFilter,
      setState: state.setState,
      reset: state.reset,
    }),
    shallow
  )

  const emptyPage: QtnRecordPage = {
    record: [],
    total: 0,
    pageNum: page.pageNum ?? DEFAULT_QTN_PAGE.pageNum,
    pageSize: page.pageSize ?? DEFAULT_QTN_PAGE.pageSize,
  }

  const { data, loading } = useRequest(
    () =>
      userId
        ? listAppUserQtn({
            userId,
            pageNum: 1,
            pageSize: MAX_QTN_PAGE_SIZE,
          })
        : Promise.resolve(emptyPage),
    {
      refreshDeps: [userId, JSON.stringify(page)],
    }
  )
  const { runAsync: runConsultationDetail, loading: detailLoading } = useRequest(
    (consultationId: number) => getConsultationDetailById(consultationId),
    { manual: true }
  )

  const records = useMemo(() => data?.record ?? [], [data])
  const symptomOptions = useMemo(() => {
    const unique = Array.from(
      new Set(records.map((item) => item.symptom).filter(Boolean))
    ) as string[]
    return ["全部症状", ...unique]
  }, [records])

  const filteredRecords = useMemo(() => {
    if (symptomFilter === "全部症状") return records
    return records.filter((item) => item.symptom === symptomFilter)
  }, [records, symptomFilter])

  const resetState = () => {
    reset()
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const toggleSelect = (record: QtnRecord, checked: boolean) => {
    const recordKey = getRecordKey(record)
    if (!recordKey) return
    if (checked) {
      if (selected.length >= MAX_COMPARE_COUNT) {
        MessagePlugin.warning(`最多选择${MAX_COMPARE_COUNT}条记录`)
        return
      }
      setState((state) => ({ selected: [...state.selected, record] }))
    } else {
      setState((state) => ({
        selected: state.selected.filter(
          (item) => getRecordKey(item) !== recordKey
        ),
      }))
    }
  }

  const openDetail = async (record: QtnRecord) => {
    if (!record.consultationId) {
      MessagePlugin.error("缺少问诊记录ID")
      return
    }
    setState({ activeRecord: record, view: "detail" })
    const detail = await runConsultationDetail(record.consultationId)
    setState({ detailData: detail })
  }

  const openCompare = async (items?: QtnRecord[]) => {
    const target = (items?.length ? items : selected).filter(
      (record) => record.consultationId
    )
    if (target.length < 2) {
      MessagePlugin.warning("请选择至少两条记录进行对比")
      return
    }
    setCompareLoading(true)
    setState({ view: "compare", compareData: [], selected: target })
    try {
      const results = await Promise.allSettled(
        target.map((record) =>
          getConsultationDetailById(record.consultationId as number)
        )
      )
      const details = results.map((result) =>
        result.status === "fulfilled"
          ? result.value
          : ({ consultation: null, qtnMainVO: null } as ConsultationDetail)
      )
      const hasFailure = results.some((result) => result.status === "rejected")
      if (hasFailure) {
        MessagePlugin.warning("部分问诊记录加载失败，已用“-”占位")
        results.forEach((result) => {
          if (result.status === "rejected") {
            console.log("对比记录加载失败：", result.reason)
          }
        })
      }
      setState({ compareData: details })
    } finally {
      setCompareLoading(false)
    }
  }

  const handleDelete = (record: QtnRecord) => {
    const label = record.batchNo ?? "该记录"
    const dialog = DialogPlugin.confirm({
      header: "确认删除",
      body: `确定删除问诊记录${label}吗？`,
      confirmBtn: "删除",
      cancelBtn: "取消",
      onConfirm: () => {
        MessagePlugin.info("暂无删除接口")
        dialog.hide()
      },
      onClose: () => dialog.hide(),
    })
  }

  const baseColumns = [
    {
      colKey: "batchNo",
      title: "问诊编号",
      width: 150,
      cell: ({ row }: { row: QtnRecord }) => (
        <span className="block max-w-[120px] truncate">
          {row.batchNo ?? "-"}
        </span>
      ),
    },
    { colKey: "name", title: "患者姓名", width: 150 },
    {
      colKey: "createTime",
      title: "创建日期",
      width: 170,
      cell: ({ row }: { row: QtnRecord }) =>
        formatDateTime(row.createTime ?? row.createDate),
    },
    {
      colKey: "updateTime",
      title: "更新日期",
      width: 170,
      cell: ({ row }: { row: QtnRecord }) =>
        formatDateTime(row.updateTime ?? row.updateDate),
    },
  ]

  const tableColumns =
    mode === "compare"
      ? [
          ...baseColumns,
          {
            colKey: "select",
            title: "对比",
            width: 120,
            cell: ({ row }: { row: QtnRecord }) => (
              <Checkbox
                checked={selected.some(
                  (item) => getRecordKey(item) === getRecordKey(row)
                )}
                onChange={(checked) => toggleSelect(row, checked)}
              />
            ),
          },
        ]
      : [
          ...baseColumns,
          {
            colKey: "actions",
            title: "操作",
            width: 140,
            cell: ({ row }: { row: QtnRecord }) => (
              <div className="flex items-center gap-3">
                <Button
                  variant="text"
                  theme="primary"
                  onClick={() => openDetail(row)}
                >
                  详情
                </Button>
                <Button
                  variant="text"
                  theme="danger"
                  onClick={() => handleDelete(row)}
                >
                  删除
                </Button>
              </div>
            ),
          },
        ]

  const listView = (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Radio.Group
          theme="button"
          variant="outline"
          value={mode}
          onChange={(value) => {
            const nextMode = String(value) as "normal" | "compare"
            if (nextMode === mode) return
            if (nextMode === "normal") {
              setState({ mode: "normal", selected: [], view: "list" })
              return
            }
            setState({ mode: "compare", view: "list" })
          }}
          options={[
            { label: "普通模式", value: "normal" },
            { label: "对比模式", value: "compare" },
          ]}
          className="qtn-segment"
        />
        <Select
          value={symptomFilter}
          onChange={(value) => setState({ symptomFilter: String(value) })}
          options={symptomOptions.map((item) => ({ label: item, value: item }))}
          className="w-[180px]"
        />
      </div>

      <div className="mt-6">
        <Table
          columns={
            mode === "compare"
              ? [
                  ...baseColumns,
                  {
                    colKey: "select",
                    title: "对比",
                    width: 120,
                    cell: ({ row }: { row: QtnRecord }) => {
                      const lockedName = selected[0]?.name
                      const isLocked =
                        Boolean(lockedName) && row.name !== lockedName
                      const isChecked = selected.some(
                        (item) => getRecordKey(item) === getRecordKey(row)
                      )
                      return (
                        <Checkbox
                          checked={isChecked}
                          disabled={isLocked}
                          onChange={(checked) => toggleSelect(row, checked)}
                        />
                      )
                    },
                  },
                ]
              : tableColumns
          }
          tableLayout="fixed"
          data={filteredRecords}
          rowKey="batchNo"
          loading={loading}
          empty="暂无问诊记录"
        />
      </div>
    </div>
  )

  return (
    <Drawer
      className="qtn-drawer"
      header={view === "list" ? `${userName ?? "用户"}的问诊记录` : false}
      visible={visible}
      placement="right"
      size="760px"
      onClose={handleClose}
      closeBtn={view === "list" ? true : false}
      footer={
        view === "list" && mode === "compare" ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button theme="primary" onClick={() => openCompare()}>
                开始对比
              </Button>
              <Button
                variant="outline"
                onClick={() => setState({ selected: [] })}
              >
                取消选择
              </Button>
            </div>
            <span
              className={`text-sm ${
                selected.length >= 2 ? "text-brand" : "text-neutral-500"
              }`}
            >
              已选择{selected.length}条记录（最多选择{MAX_COMPARE_COUNT}条记录）
            </span>
          </div>
        ) : null
      }
    >
      <Loading loading={detailLoading} className="h-full">
        {view === "list" ? (
          listView
        ) : null}
        {view === "detail" && activeRecord ? (
          <DetailView
            record={activeRecord}
            detail={detailData}
            userName={userName ?? "用户"}
            onBack={() => setState({ view: "list" })}
            onClose={handleClose}
          />
        ) : null}
        {view === "compare" ? (
          <CompareView
            records={selected}
            details={compareData}
            loading={compareLoading}
            onBack={() => setState({ view: "list" })}
            onClose={handleClose}
          />
        ) : null}
      </Loading>
    </Drawer>
  )
}
