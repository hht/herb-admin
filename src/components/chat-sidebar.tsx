import dayjs from "dayjs"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useAddressContext, useConversationContext } from "easemob-chat-uikit"
import { ChevronLeftIcon, CloseIcon, EditIcon } from "tdesign-icons-react"
import {
  Button,
  Drawer,
  Form,
  Input,
  Loading,
  MessagePlugin,
  Radio,
  Select,
  Textarea,
} from "tdesign-react"
import { shallow } from "zustand/shallow"

import type { FC, ReactNode } from "react"

import { useRequest } from "~/hooks/useRequest"
import { useHerbStore } from "~/hooks/useStore"
import qtnUserBusinessSvg from "~/assets/figma/qtn-user-business.svg?raw"
import qtnInfoSvg from "~/assets/figma/qtn-info.svg?raw"
import qtnViewSvg from "~/assets/figma/qtn-view.svg?raw"
import {
  buildQuestionSections,
  buildSeverityLabelMap,
  formatQuestionAnswer,
  formatQuestionTitle,
  ImageViewerDialog,
  TableBlock,
  TruncatedText,
} from "~/components/qtn/qtn-detail"
import {
  ConsultationTabsBar,
  useConsultationScrollTabs,
} from "~/components/qtn/consultation-scroll-tabs"
import {
  listHealthTemplates,
  type HealthContentInput,
  type HealthTemplate,
} from "~/services/health-templates"
import { createOrder } from "~/services/orders"
import { getConsultationDetailByGroupId, type QtnQuestion } from "~/services/app-user-qtn"
import {
  createEmptyOrderContent,
  useOrderStore,
} from "~/stores/order-store"
import { listEmployees, type Employee } from "~/services/employees"
import { joinUserToGroup } from "~/services/chat-groups"
import { editConsultation, type ConsultationEditPayload } from "~/services/consultations"
import { QtnRecordsDrawer } from "~/components/qtn/qtn-records-drawer"

export type SidebarTab =
  | "questionnaire"
  | "orders"
  | "qtn-records"
  | "appointments"
  | "appointment-records"
  | "add-advisor"
  | "patient-info"
  | "terminate"

export type ConsultationDrawerSection = "info" | "questionnaire" | "diagnosis"

interface ChatSidebarProps {
  activeTab: SidebarTab | null
  consultationSection?: ConsultationDrawerSection
  onClose: () => void
}

const tabTitles: Record<SidebarTab, string> = {
  questionnaire: "问卷",
  orders: "创建订单",
  "qtn-records": "问诊记录",
  appointments: "预约问诊/回诊",
  "appointment-records": "预约记录",
  "add-advisor": "添加健康顾问/医生",
  "patient-info": "病人信息",
  terminate: "终止/回绝",
}

const SvgIcon = ({
  svg,
  className,
}: {
  svg: string
  className?: string
}) => <span className={className} dangerouslySetInnerHTML={{ __html: svg }} />

const formatDateTime = (value?: string | null) => {
  if (!value) return "-"
  const date = dayjs(value)
  return date.isValid() ? date.format("YYYY.MM.DD HH:mm") : "-"
}

const QuestionnaireContent = () => {
  const { currentConversation } = useConversationContext()
  const groupId =
    currentConversation?.chatType === "groupChat"
      ? currentConversation.conversationId
      : undefined

  const { data, loading } = useRequest(
    () =>
      groupId
        ? getConsultationDetailByGroupId(groupId)
        : Promise.resolve(null),
    { refreshDeps: [groupId] }
  )

  const consultation = (data?.consultation ?? {}) as Record<string, unknown>
  const patientName =
    (consultation.patient as string) ||
    (consultation.patientName as string) ||
    (consultation.userName as string) ||
    "-"
  const createTime = formatDateTime(consultation.createTime as string)

  return (
    <div className="p-4">
      <Loading loading={loading}>
        {groupId && data ? (
          <div className="rounded border border-border bg-white p-4">
            <div className="text-sm font-medium text-neutral-950/90">
              {patientName}（{createTime}）
            </div>
            <div className="mt-2 text-xs text-neutral-950/40">
              点击顶部标签「问卷」查看详情并编辑诊断报告
            </div>
          </div>
        ) : (
          <div className="rounded border border-border bg-white p-4 text-sm text-neutral-950/60">
            {groupId ? "暂无问诊信息" : "请选择群聊后查看问诊"}
          </div>
        )}
      </Loading>
    </div>
  )
}

const buildContentState = (template?: HealthTemplate | null) => {
  if (!template?.contents?.length) {
    return [createEmptyOrderContent(0)]
  }
  return template.contents.map((item, index) => ({
    title: item.title ?? `服务${index + 1}`,
    name: item.name ?? "",
    content: item.content ?? "",
  }))
}

const normalizeContents = (contents: HealthContentInput[]) =>
  contents
    .map((item, index) => ({
      title: item.title?.trim() || `服务${index + 1}`,
      name: item.name?.trim() || "",
      content: item.content?.trim() || "",
    }))
    .filter((item, index) => index === 0 || item.name || item.content)

const toNumber = (value: unknown) => {
  if (value === "" || value === null || value === undefined) return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

interface OrdersContentProps {
  onClose?: () => void
}

const OrdersContent: FC<OrdersContentProps> = ({ onClose }) => {
  const handleClose = onClose ?? (() => {})
  const { currentConversation } = useConversationContext()
  const groupId =
    currentConversation?.chatType === "groupChat"
      ? currentConversation.conversationId
      : undefined
  const prevGroupIdRef = useRef<string | undefined>(groupId)
  const { contents, createdOrder, setState, reset } = useOrderStore(
    (state) => ({
      contents: state.contents,
      createdOrder: state.createdOrder,
      setState: state.setState,
      reset: state.reset,
    }),
    shallow
  )
  const [form] = Form.useForm()
  const editSnapshotRef = useRef<{
    values: Record<string, unknown>
    contents: HealthContentInput[]
  } | null>(null)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const priceValue = Form.useWatch("price", form)
  const packageNameValue = Form.useWatch("packageName", form)
  const selectedTemplateId = toNumber(Form.useWatch("templateId", form))
  const hasPackage = Boolean(selectedTemplateId)

  const { data, loading, error: templatesError } = useRequest(
    () => listHealthTemplates({ pageNum: 1, pageSize: 10 }),
    {
      refreshDeps: [],
    }
  )
  const { runAsync: runCreate, loading: createLoading } = useRequest(
    createOrder,
    { manual: true }
  )

  const isEditing = Boolean(groupId && editingGroupId === groupId)
  const {
    data: consultationDetail,
    loading: consultationLoading,
    error: consultationError,
    runAsync: reloadConsultation,
  } = useRequest(
    () =>
      groupId
        ? getConsultationDetailByGroupId(groupId)
        : Promise.resolve(null),
    {
      refreshDeps: [groupId],
    }
  )

  const templates = useMemo(() => data?.record ?? [], [data])
  const templateOptions = useMemo(
    () =>
      templates
        .filter((item) => item.packageId !== null && item.packageId !== undefined)
        .map((item) => ({
          label: item.name ?? "未命名套餐",
          value: item.packageId as number,
        })),
    [templates]
  )
  const packageOptions = useMemo(() => {
    if (!selectedTemplateId) return templateOptions
    const exists = templateOptions.some(
      (option) => option.value === selectedTemplateId
    )
    if (exists) return templateOptions
    const label =
      typeof packageNameValue === "string" && packageNameValue.trim()
        ? packageNameValue
        : "已选套餐"
    return [...templateOptions, { label, value: selectedTemplateId }]
  }, [packageNameValue, selectedTemplateId, templateOptions])
  const diseaseOptions = useMemo(() => {
    const options = templates
      .map((item) => item.disease)
      .filter((item): item is string => Boolean(item && item.trim()))
    const unique = Array.from(new Set(options))
    return unique.map((item) => ({ label: item, value: item }))
  }, [templates])
  const templatePrice = useMemo(() => {
    if (!selectedTemplateId) return undefined
    return templates.find((item) => item.packageId === selectedTemplateId)?.price
  }, [selectedTemplateId, templates])
  const displayPrice = useMemo(() => {
    if (priceValue === undefined || priceValue === null || priceValue === "") {
      if (templatePrice === undefined || templatePrice === null) return "-"
      return String(templatePrice)
    }
    return String(priceValue)
  }, [priceValue, templatePrice])

  const handleTemplateChange = (value: unknown) => {
    if (typeof value !== "string" && typeof value !== "number") {
      setState({
        contents: [createEmptyOrderContent(0)],
        createdOrder: null,
      })
      form.setFieldsValue({
        templateId: null,
        packageName: "",
        price: "",
        originalPrice: "",
      })
      editSnapshotRef.current = null
      setEditingGroupId(null)
      return
    }
    const nextId = toNumber(value)
    if (nextId === undefined) {
      setState({
        contents: [createEmptyOrderContent(0)],
        createdOrder: null,
      })
      form.setFieldsValue({
        templateId: null,
        packageName: "",
        price: "",
        originalPrice: "",
      })
      editSnapshotRef.current = null
      setEditingGroupId(null)
      return
    }
    const template = templates.find((item) => item.packageId === nextId)
    form.setFieldsValue({ templateId: nextId })
    if (!template) {
      setState({
        contents: [createEmptyOrderContent(0)],
        createdOrder: null,
      })
      return
    }
    form.setFieldsValue({
      disease: template.disease ?? "",
      packageName: template.name ?? "",
      price:
        template.price === null || template.price === undefined
          ? ""
          : String(template.price),
      originalPrice:
        template.originalPrice === null || template.originalPrice === undefined
          ? ""
          : String(template.originalPrice),
    })
    setState({
      contents: buildContentState(template),
      createdOrder: null,
    })
    editSnapshotRef.current = null
  }

  const updateService = (
    index: number,
    key: keyof HealthContentInput,
    value: string
  ) => {
    setState((state) => ({
      contents: state.contents.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [key]: value,
            }
          : item
      ),
    }))
  }

  const handleAddService = () => {
    setState((state) => ({
      contents: [
        ...state.contents,
        createEmptyOrderContent(state.contents.length),
      ],
    }))
  }

  const handleRemoveService = (index: number) => {
    setState((state) => ({
      contents: state.contents.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const handleReset = () => {
    form.reset()
    reset()
    editSnapshotRef.current = null
    setEditingGroupId(null)
  }

  const getText = (...values: unknown[]) => {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) return value
      if (typeof value === "number" && !Number.isNaN(value)) {
        return String(value)
      }
    }
    return ""
  }

  const getStringId = (...values: unknown[]) => {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) {
        return value.trim()
      }
      if (typeof value === "number" && !Number.isNaN(value)) {
        return String(value)
      }
    }
    return undefined
  }

  const toRecord = useCallback(
    (value: unknown) =>
      value && typeof value === "object"
        ? (value as Record<string, unknown>)
        : {},
    []
  )

  const resolveMainFromDetail = useCallback(
    (detail: unknown) => {
      const detailRecord = toRecord(detail)
      const candidates = [
        detailRecord.qtnMainVO,
        detailRecord.qtnMainVo,
        detailRecord.qtnMain,
        detailRecord.questions ? detailRecord : null,
        toRecord(detailRecord.consultation).qtnMainVO,
        toRecord(detailRecord.consultation).qtnMain,
      ]
      const target = candidates.find(
        (item) => item && typeof item === "object"
      )
      return toRecord(target)
    },
    [toRecord]
  )

  const resolveMainFirst = useCallback(
    (detail: unknown) => {
      const main = resolveMainFromDetail(detail)
      const list = main.list
      if (Array.isArray(list) && list.length > 0) {
        return toRecord(list[0])
      }
      return main
    },
    [resolveMainFromDetail, toRecord]
  )
  const consultation = useMemo(() => {
    if (consultationDetail?.consultation) {
      return toRecord(consultationDetail.consultation)
    }
    return toRecord(consultationDetail)
  }, [consultationDetail, toRecord])

  const qtnMain = useMemo(
    () => resolveMainFromDetail(consultationDetail),
    [consultationDetail, resolveMainFromDetail]
  )
  const questions = useMemo(() => {
    const record = qtnMain as Record<string, unknown>
    const steps = Array.isArray(record.list) ? record.list : []
    if (steps.length) {
      return steps.flatMap((step) => {
        const stepRecord = toRecord(step)
        const stepTitle =
          typeof stepRecord.title === "string" ? stepRecord.title : ""
        const stepQuestions = Array.isArray(stepRecord.questions)
          ? [...(stepRecord.questions as QtnQuestion[])].sort(
              (a, b) => (a.sort ?? 0) - (b.sort ?? 0)
            )
          : []
        const result: QtnQuestion[] = []
        if (stepTitle) {
          result.push({
            title: stepTitle,
            type: 10,
            options: [],
            tips1:
              typeof stepRecord.tips1 === "string"
                ? stepRecord.tips1
                : undefined,
            tips2:
              typeof stepRecord.tips2 === "string"
                ? stepRecord.tips2
                : undefined,
          })
        }
        return [...result, ...stepQuestions]
      })
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
    if (!Array.isArray(list)) return []
    return [...(list as QtnQuestion[])].sort(
      (a, b) => (a.sort ?? 0) - (b.sort ?? 0)
    )
  }, [qtnMain, toRecord])

  const qtnMainFirst = useMemo(
    () => resolveMainFirst(consultationDetail),
    [consultationDetail, resolveMainFirst]
  )

  const patientName = getText(
    consultation.userName,
    consultation.name,
    consultation.nickName
  )
  const doctorName = getText(
    consultation.doctorName,
    consultation.doctor,
    consultation.doctorUserName,
    consultation.advisorName
  )
  const doctorDiagnosis = getText(consultation.doctorMsg)
  const advisorRemark = getText(consultation.advisorMsg)
  const adviceRemark = getText(consultation.adviceMsg)
  const decodeAnswer = (answer?: string | null) => {
    if (!answer) return []
    return answer
      .split("|")
      .map((item) => item.split(":"))
      .map((item) => ({
        optionId: item[0],
        ext: item[1],
      }))
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
  const normalizeAnswer = (value: string) => {
    const trimmed = value.trim()
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
  const severityColors: Record<number, string> = {
    1: "#999999",
    2: "#2BA471",
    3: "#E37318",
    4: "#FF7B15",
    5: "#FF5F57",
  }
  const severityLabelMap = useMemo(() => {
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
  }, [qtnMain, toRecord])
  const renderTag = (label: string) => (
    <span className="inline-flex items-center rounded-[3px] border border-[#e7e7e7] bg-[#f3f3f3] px-2 py-0.5 text-[12px] leading-[20px] text-[rgba(0,0,0,0.6)]">
      {label}
    </span>
  )
  const renderViewLink = () => (
    <span className="inline-flex items-center gap-1 text-[12px] leading-[20px] text-brand">
      <SvgIcon svg={qtnViewSvg} className="inline-flex size-4" />
      查看图片
    </span>
  )
  const renderSeverityTag = (label: string, level?: number) => {
    if (!level) return renderTag(label)
    const color = severityColors[level] ?? severityColors[1]
    const severityText = severityLabelMap[level]
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
  const formatQuestionAnswer = (question: QtnQuestion): ReactNode => {
    const rawAnswer = question.userAnswer ?? question.answer ?? question.other ?? ""
    const answer = String(rawAnswer)
    const normalized = normalizeAnswer(answer)
    if (question.type === 1) {
      return answer === "1" ? "是" : answer === "0" ? "否" : normalized
    }
    if (question.type === 9 || question.type === 3) {
      const label = getOptionLabel(question, answer)
      return (label ?? normalized) || "-"
    }
    if (question.type === 4) {
      const label = getOptionLabel(question, answer)
      return (label ?? normalized) || "-"
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
            const level = Number(item.ext)
            return (
              <div key={item.optionId}>
                {renderSeverityTag(
                  getOptionLabel(question, item.optionId),
                  Number.isNaN(level) ? undefined : level
                )}
              </div>
            )
          })}
        </div>
      )
    }
    if (question.type === 7 || question.type === 8) {
      const rich = question.type === 7 ? parseRichAnswer(answer) : null
      const images = rich?.images?.length
        ? rich.images
        : parseAnswerImages(answer)
      if (!images.length && !rich?.text) {
        return question.type === 7 ? normalized : "-"
      }
      if (question.type === 7) {
        if (!images.length) {
          return rich?.text ?? normalized
        }
        if (rich?.text) {
          return (
            <div className="space-y-1">
              <div className="whitespace-pre-wrap">{rich.text}</div>
              {renderViewLink()}
            </div>
          )
        }
        return renderViewLink()
      }
      return (
        <div className="space-y-2">
          {rich?.text ? (
            <div className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)] whitespace-pre-wrap">
              {rich.text}
            </div>
          ) : null}
          {images.length ? (
            <div className="flex flex-wrap gap-2">
              {images.map((src) => (
                <div
                  key={src}
                  className="flex size-[60px] items-center justify-center rounded border border-[#e7e7e7] bg-[#f3f3f3]"
                >
                  <img src={src} alt="" className="size-[52px] object-contain" />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )
    }
    const display = normalized
    if (question.type === 2 || question.type === 11) {
      const shouldAppendUnit =
        question.unit && display !== "-" && !Number.isNaN(Number(display))
      return shouldAppendUnit ? `${display} ${question.unit}` : display
    }
    return display
  }
  const diagnosisBlocks = useMemo(
    () => [
      { title: "健康顾问备注", content: advisorRemark },
      { title: "医生诊断", content: doctorDiagnosis },
      { title: "治疗建议", content: adviceRemark },
    ],
    [advisorRemark, adviceRemark, doctorDiagnosis]
  )

  const questionSections = useMemo(() => {
    const record = qtnMain as Record<string, unknown>
    const steps = Array.isArray(record.list) ? record.list : []
    const hiddenTips = new Set([
      "请按照示例拍摄并上传以下部位的照片，确保清晰、无遮挡。（大小控制200K以内）",
      "所有照片仅用于健康问卷分析，我们将严格保密，不会对外公开。",
    ])
    const sanitizeTips = (tips: Array<string | null | undefined>) =>
      tips
        .filter((item): item is string => Boolean(item && item.trim()))
        .map((item) => item.trim())
        .filter((item) => !hiddenTips.has(item))
    const sections: Array<{
      key: string
      title?: string
      tips?: string[]
      questions: QtnQuestion[]
    }> = []
    const buildSections = (list: QtnQuestion[], prefix: string, tips?: string[]) => {
      const sorted = [...list].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
      let current: {
        key: string
        title?: string
        tips?: string[]
        questions: QtnQuestion[]
      } = { key: `${prefix}-0`, tips, questions: [] }
      let index = 1
      sorted.forEach((question) => {
        if (question.type === 10) {
          if (current.questions.length) {
            sections.push(current)
          }
          const titleText = question.title?.trim()
          current = {
            key: `${prefix}-${index}`,
            title: titleText === "选填项" ? undefined : titleText,
            tips: sanitizeTips([question.tips1, question.tips2]),
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
        const stepQuestions = Array.isArray(stepRecord.questions)
          ? (stepRecord.questions as QtnQuestion[])
          : []
        const stepTips = sanitizeTips([
          typeof stepRecord.tips1 === "string" ? stepRecord.tips1 : undefined,
          typeof stepRecord.tips2 === "string" ? stepRecord.tips2 : undefined,
        ])
        if (!stepQuestions.length) return
        buildSections(stepQuestions, `step-${stepIndex}`, stepTips)
      })
      return sections
    }
    if (questions.length) {
      buildSections(questions, "default")
    }
    return sections
  }, [qtnMain, questions, toRecord])

  useEffect(() => {
    if (!consultationDetail) return
    const userAnswerId = getStringId(
      consultation.userAnswerId,
      consultation.answerId,
      consultation.consultationId,
      qtnMainFirst.id,
      qtnMainFirst.mainId,
      qtnMainFirst.qtnMainId
    )
    if (userAnswerId && !form.getFieldValue("userAnswerId")) {
      form.setFieldsValue({ userAnswerId })
    }
    const disease = getText(consultation.disease, qtnMainFirst.disease)
    if (disease && !form.getFieldValue("disease")) {
      form.setFieldsValue({ disease })
    }
  }, [consultation, consultationDetail, form, qtnMainFirst])

  useEffect(() => {
    if (prevGroupIdRef.current === groupId) return
    prevGroupIdRef.current = groupId
    form.reset()
    reset()
    editSnapshotRef.current = null
  }, [form, groupId, reset])

  const handleEdit = () => {
    if (!groupId) return
    editSnapshotRef.current = {
      values: form.getFieldsValue(true) as Record<string, unknown>,
      contents: [...contents],
    }
    setEditingGroupId(groupId)
  }

  const handleCancelEdit = () => {
    const snapshot = editSnapshotRef.current
    if (snapshot) {
      form.setFieldsValue(snapshot.values)
      setState({ contents: snapshot.contents })
    }
    setEditingGroupId(null)
  }

  const handleSaveEdit = async () => {
    const valid = await form.validate()
    if (valid !== true) return
    const requiredContent = contents[0]
    if (!requiredContent?.name?.trim() || !requiredContent?.content?.trim()) {
      MessagePlugin.warning("请完善服务一的名称和内容")
      return
    }
    editSnapshotRef.current = null
    setEditingGroupId(null)
  }

  const handleSubmit = async () => {
    const valid = await form.validate()
    if (valid !== true) return
    const requiredContent = contents[0]
    if (!requiredContent?.name?.trim() || !requiredContent?.content?.trim()) {
      MessagePlugin.warning("请完善服务一的名称和内容")
      return
    }
    const values = form.getFieldsValue(true) as Record<string, unknown>
    let detail = consultationDetail
    if (!detail && groupId) {
      detail = await reloadConsultation()
    }
    const detailMain = resolveMainFirst(detail)
    const userAnswerId = getStringId(
      values.userAnswerId,
      detail?.consultation?.userAnswerId,
      detail?.consultation?.answerId,
      detail?.consultation?.consultationId,
      detailMain.id,
      detailMain.mainId,
      detailMain.qtnMainId
    )
    const price = toNumber(values.price)
    if (!userAnswerId) {
      MessagePlugin.warning("未获取到问诊ID，请确认群聊已绑定问诊")
      return
    }
    if (price === undefined) {
      MessagePlugin.warning("请输入订单价格")
      return
    }
    if (!groupId) {
      MessagePlugin.warning("请选择群聊后创建订单")
      return
    }
    const templateIdValue = toNumber(values.templateId)
    const template = templates.find((item) => item.packageId === templateIdValue)
    const packageName = getText(values.packageName, template?.name)
    if (!packageName) {
      MessagePlugin.warning("请选择套餐")
      return
    }
    const payload = {
      userAnswerId,
      disease: String(values.disease ?? ""),
      packageName,
      price,
      originalPrice: toNumber(values.originalPrice),
      contents: normalizeContents(contents),
    }
    const result = await runCreate(payload)
    setState({
      createdOrder: {
        orderId: result.orderId ?? null,
        orderNum: result.orderNum ?? null,
      },
    })
    MessagePlugin.success(`订单创建成功（${result.orderNum ?? "已生成"}）`)
    handleClose()
  }

  const canSendOrder = Boolean(groupId && hasPackage && !isEditing)

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-[#e7e7e7] px-4 py-4">
        <button
          type="button"
          className="flex items-center gap-2 text-[14px] leading-[22px] text-[rgba(0,0,0,0.6)] hover:text-[rgba(0,0,0,0.9)]"
          onClick={handleClose}
        >
          <ChevronLeftIcon size={16} />
          返回
        </button>
        <div className="text-[16px] font-semibold leading-[24px] text-[rgba(0,0,0,0.9)]">
          创建订单
        </div>
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded hover:bg-[#f3f3f3]"
          onClick={handleClose}
        >
          <CloseIcon size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {templatesError || consultationError ? (
          <div className="flex h-full items-center justify-center px-12 text-[14px] leading-[22px] text-[rgba(0,0,0,0.6)]">
            {templatesError instanceof Error
              ? templatesError.message
              : consultationError instanceof Error
                ? consultationError.message
                : "加载失败，请稍后重试"}
          </div>
        ) : loading || consultationLoading ? (
          <Loading loading size="small" className="h-full" />
        ) : (
          <Form
            form={form}
            labelAlign="top"
            layout="vertical"
            colon={false}
            className="flex h-full flex-col"
          >
            <div className="min-h-0 flex-1 overflow-hidden">
              <div className="flex h-full">
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="border-b border-[#e7e7e7]">
                    <div className="px-[23px]">
                      <div className="flex h-[60px] items-center border-b border-[#e7e7e7] text-[16px] font-semibold leading-[24px] text-[rgba(0,0,0,0.9)]">
                        问诊信息
                      </div>
                    </div>
                    <div className="px-[23px] pb-6 pt-6">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#ecf9f1]">
                          <SvgIcon
                            svg={qtnUserBusinessSvg}
                            className="inline-flex size-4"
                          />
                        </span>
                        <span className="text-[20px] leading-[28px] text-[rgba(0,0,0,0.9)]">
                          患者问卷
                        </span>
                      </div>
                      <div className="mt-6 w-[592px] space-y-5">
                        {questionSections.length ? (
                          <div className="space-y-5">
                            {questionSections.map((section) => (
                              <div key={section.key} className="space-y-3">
                                {section.title ? (
                                  <div className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                                    {section.title}
                                  </div>
                                ) : null}
                                {section.tips?.length ? (
                                  <div className="space-y-1 text-[12px] leading-[20px] text-[rgba(0,0,0,0.4)]">
                                    {section.tips.map((tip) => (
                                      <div key={`${section.key}-${tip}`}>
                                        {tip}
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                                <div className="overflow-hidden rounded border border-[#e7e7e7]">
                                  <table className="w-full table-fixed text-[14px] leading-[22px]">
                                    <thead>
                                      <tr className="bg-[#f3f3f3] text-[rgba(0,0,0,0.4)]">
                                        {section.questions.map((question, index) => (
                                          <th
                                            key={`${section.key}-header-${question.questionId ?? index}`}
                                            className={`px-4 py-2 text-left font-normal ${
                                              index === section.questions.length - 1
                                                ? ""
                                                : "border-r border-[#e7e7e7]"
                                            }`}
                                          >
                                            {question.title || "-"}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr className="border-t border-[#e7e7e7]">
                                        {section.questions.map((question, index) => (
                                          <td
                                            key={`${section.key}-cell-${question.questionId ?? index}`}
                                            className={`px-4 py-3 align-top text-[rgba(0,0,0,0.9)] ${
                                              index === section.questions.length - 1
                                                ? ""
                                                : "border-r border-[#e7e7e7]"
                                            }`}
                                          >
                                            {formatQuestionAnswer(question)}
                                          </td>
                                        ))}
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                            暂无问卷数据
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-[14px] font-semibold text-[#267347]">
                          <span className="inline-flex size-4 items-center justify-center rounded-full bg-[#267347] text-[10px] leading-[14px] text-white">
                            ✓
                          </span>
                          诊断报告
                        </div>
                        {diagnosisBlocks.map((block) => (
                          <div key={block.title} className="w-full">
                            <div className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                              {block.title}
                            </div>
                            <div className="mt-2 min-h-[124px] whitespace-pre-wrap rounded-[3px] border border-[#dcdcdc] bg-white px-2 py-[5px] text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                              {block.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="min-h-0 w-[360px] shrink-0 border-l border-[#e7e7e7]">
                  <div className="flex h-full flex-col">
                    <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-6">
                      <div className="w-[312px] pb-6">
                        <div className="text-[16px] font-semibold leading-[24px] text-[rgba(0,0,0,0.9)]">
                          订单信息
                        </div>
                      </div>
                      <div className="w-[312px] pb-6">
                        <div className="flex gap-3">
                          <div className="flex w-[100px] flex-col gap-6 text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                            <span>订单编号</span>
                            <span>病患姓名</span>
                            <span>问诊医生</span>
                          </div>
                          <div className="flex w-[200px] flex-col gap-6 text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                            <span>{createdOrder?.orderNum ?? "-"}</span>
                            <span>{patientName || "-"}</span>
                            <span>{doctorName || "-"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="w-[312px] pb-6">
                        <div className="flex items-center gap-0.5 pb-2 text-[14px] leading-[22px]">
                          <span className="text-[rgba(0,0,0,0.9)]">
                            选择病种
                          </span>
                          <span className="text-[#d54941]">*</span>
                        </div>
                        <Form.FormItem
                          name="disease"
                          rules={[{ required: true, message: "请选择病种" }]}
                          className="!mb-0"
                        >
                          <Select
                            placeholder="选择病种"
                            clearable
                            filterable
                            creatable
                            options={diseaseOptions}
                          />
                        </Form.FormItem>
                      </div>

                      <div className="w-[312px] pb-6">
                        <div className="flex items-center gap-0.5 pb-2 text-[14px] leading-[22px]">
                          <span className="text-[rgba(0,0,0,0.9)]">
                            选择套餐
                          </span>
                          <span className="text-[#d54941]">*</span>
                        </div>
                        <Form.FormItem
                          name="templateId"
                          rules={[{ required: true, message: "请选择套餐" }]}
                          className="!mb-0"
                        >
                          <Select
                            placeholder="选择套餐"
                            clearable
                            filterable
                            options={packageOptions}
                            onChange={(value) => handleTemplateChange(value)}
                          />
                        </Form.FormItem>
                      </div>

                      {isEditing ? (
                        <div className="w-[312px] border-t border-[#e7e7e7] px-4 py-6">
                          <div className="space-y-6">
                            <div className="space-y-4">
                              {contents.map((service, index) => {
                                const isRequired = index === 0
                                return (
                                  <div
                                    key={service.title ?? index}
                                    className="space-y-2"
                                  >
                                    <div className="flex items-center justify-between text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                                      <div className="flex items-center gap-1">
                                        <span>{`服务${index + 1}`}</span>
                                        {isRequired ? (
                                          <span className="text-[#d54941]">*</span>
                                        ) : (
                                          <span className="text-[rgba(0,0,0,0.6)]">
                                            （选填）
                                          </span>
                                        )}
                                      </div>
                                      {isRequired ? null : (
                                        <button
                                          type="button"
                                          className="flex size-5 items-center justify-center text-[rgba(0,0,0,0.6)]"
                                          onClick={() => handleRemoveService(index)}
                                        >
                                          <CloseIcon size={14} />
                                        </button>
                                      )}
                                    </div>
                                    <Input
                                      value={service.name ?? ""}
                                      onChange={(value) =>
                                        updateService(index, "name", value)
                                      }
                                      placeholder="请输入服务名"
                                    />
                                    <Textarea
                                      value={service.content ?? ""}
                                      onChange={(value) =>
                                        updateService(index, "content", value)
                                      }
                                      placeholder="请输入服务详细内容"
                                      autosize={{ minRows: 3, maxRows: 4 }}
                                    />
                                  </div>
                                )
                              })}
                              <button
                                type="button"
                                className="flex w-full justify-end text-[12px] leading-[20px] text-brand"
                                onClick={handleAddService}
                              >
                                添加服务
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div />
                      )}

                      <div
                        className={`w-[312px] border-t border-[#e7e7e7] px-4 py-6 ${
                          isEditing ? "" : "hidden"
                        }`}
                      >
                        <div className="space-y-6">
                          <div>
                            <div className="flex items-center gap-0.5 pb-2 text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                              <span>套餐现价</span>
                              <span className="text-[#d54941]">*</span>
                            </div>
                            <Form.FormItem
                              name="price"
                              rules={[{ required: true, message: "请输入价格" }]}
                              className="!mb-0"
                            >
                              <Input placeholder="请填写价格" suffix="人民币" />
                            </Form.FormItem>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 pb-2 text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                              <span>套餐原价</span>
                              <span className="text-[rgba(0,0,0,0.6)]">
                                （选填）
                              </span>
                            </div>
                            <Form.FormItem name="originalPrice" className="!mb-0">
                              <Input placeholder="请填写价格" suffix="人民币" />
                            </Form.FormItem>
                          </div>
                          <div className="flex items-center justify-end gap-5 text-[12px] leading-[20px]">
                            <button
                              type="button"
                              className="text-brand"
                              onClick={handleSaveEdit}
                            >
                              保存编辑
                            </button>
                            <button
                              type="button"
                              className="text-[rgba(0,0,0,0.6)]"
                              onClick={handleCancelEdit}
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      </div>

                      {!isEditing && hasPackage ? (
                        <div className="w-[312px] border-t border-[#e7e7e7] px-4 py-6">
                          <div className="space-y-6">
                            <div className="space-y-4">
                              {contents.map((service, index) => (
                                <div
                                  key={service.title ?? index}
                                  className="space-y-1"
                                >
                                  <p className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                                    {service.name || `服务${index + 1}`}
                                  </p>
                                  <p className="text-[12px] leading-[20px] text-[rgba(0,0,0,0.6)]">
                                    {service.content || "-"}
                                  </p>
                                </div>
                              ))}
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-start gap-2">
                                <span className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                                  现价：
                                </span>
                                <div className="flex items-center gap-1 text-[14px] font-semibold leading-[22px] text-[#1a1a1a]">
                                  <span>¥</span>
                                  <span>{displayPrice}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="flex w-full items-center justify-end gap-1 text-[12px] leading-[20px] text-[rgba(0,0,0,0.6)]"
                                onClick={handleEdit}
                              >
                                <EditIcon
                                  size={16}
                                  className="text-[rgba(0,0,0,0.6)]"
                                />
                                编辑
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <Form.FormItem name="packageName" className="hidden">
                        <Input />
                      </Form.FormItem>
                      <Form.FormItem name="userAnswerId" className="hidden">
                        <Input />
                      </Form.FormItem>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Form>
        )}
      </div>

      <div className="border-t border-[#e7e7e7] bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          <div className="text-[12px] leading-[20px] text-[rgba(0,0,0,0.4)]">
            {!groupId
              ? "请选择群聊后创建订单"
              : isEditing
              ? "编辑订单信息"
              : hasPackage
              ? "确认无误后发送订单"
              : "请选择套餐后继续"}
          </div>
          <div className="flex items-center gap-3">
            {canSendOrder ? (
              <Button
                theme="primary"
                loading={createLoading}
                onClick={handleSubmit}
                className="!h-8 !rounded-[3px] !px-4 !text-[14px] !leading-[22px]"
              >
                发送订单
              </Button>
            ) : null}
            {canSendOrder ? (
              <Button
                variant="base"
                onClick={handleReset}
                className="!h-8 !rounded-[3px] !bg-[#e7e7e7] !px-4 !text-[14px] !leading-[22px] !text-[rgba(0,0,0,0.9)]"
              >
                取消
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={handleClose}
              className="!h-8 !rounded-[3px] !px-4 !text-[14px] !leading-[22px]"
            >
              关闭
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const AppointmentsContent = () => {
  return (
    <div className="p-4">
      <div className="text-center text-sm text-neutral-950/40">暂无预约问诊</div>
    </div>
  )
}

const AppointmentRecordsContent = () => {
  return (
    <div className="p-4">
      <div className="text-center text-sm text-neutral-950/40">暂无预约记录</div>
    </div>
  )
}

const ChatConsultationDetailContent = ({
  onClose,
  initialSectionKey,
}: {
  onClose: () => void
  initialSectionKey?: ConsultationDrawerSection
}) => {
  const sessionRole = useHerbStore((state) => state.role)
  const { currentConversation } = useConversationContext()
  const groupId =
    currentConversation?.chatType === "groupChat"
      ? currentConversation.conversationId
      : undefined

  const {
    data: detail,
    loading,
    error: detailError,
    runAsync: reload,
  } = useRequest(
    () =>
      groupId
        ? getConsultationDetailByGroupId(groupId)
        : Promise.resolve(null),
    { refreshDeps: [groupId] }
  )

  const getText = (...values: unknown[]) => {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) return value
      if (typeof value === "number" && !Number.isNaN(value)) return String(value)
    }
    return "-"
  }
  const toRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  const resolveMainFromDetail = (value: unknown) => {
    const detailRecord = toRecord(value)
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
    return candidates.find((item) => item && typeof item === "object") ?? null
  }

  const detailRecord = toRecord(detail)
  const dataRecord = toRecord(detailRecord.data)
  const consultation = toRecord(
    detailRecord.consultation ?? dataRecord.consultation ?? detailRecord
  )
  const qtnMain = resolveMainFromDetail(detail)
  const questionSections = useMemo(
    () => buildQuestionSections(qtnMain),
    [qtnMain]
  )
  const severityLabelMap = useMemo(
    () => buildSeverityLabelMap(qtnMain),
    [qtnMain]
  )

  const consultationId =
    typeof consultation.consultationId === "number"
      ? consultation.consultationId
      : undefined

  const hasConsultation = Boolean(groupId && detail && consultationId)

  const [imageViewer, setImageViewer] = useState<{
    visible: boolean
    title: string
    images: string[]
    initialIndex: number
  }>({ visible: false, title: "", images: [], initialIndex: 0 })

  const [draftMsgs, setDraftMsgs] = useState<{
    advisorMsg?: string
    doctorMsg?: string
    adviceMsg?: string
  }>({})
  const advisorMsg =
    draftMsgs.advisorMsg ?? String(consultation.advisorMsg ?? "")
  const doctorMsg = draftMsgs.doctorMsg ?? String(consultation.doctorMsg ?? "")
  const adviceMsg = draftMsgs.adviceMsg ?? String(consultation.adviceMsg ?? "")

  const canEditAdvisorMsg = sessionRole === 4
  const canEditDoctorFields = sessionRole === 3
  const canSave = canEditAdvisorMsg || canEditDoctorFields
  const showSaveButton = hasConsultation && canSave

  const { runAsync: runEdit, loading: saving } = useRequest(editConsultation, {
    manual: true,
  })

  const openImages = useCallback(
    (payload: { title: string; images: string[]; initialIndex?: number }) => {
      if (!payload.images.length) return
      setImageViewer({
        visible: true,
        title: payload.title,
        images: payload.images,
        initialIndex: payload.initialIndex ?? 0,
      })
    },
    [setImageViewer]
  )

  const scrollMarker =
    groupId && detail
      ? `${groupId}:${consultationId ?? "unknown"}:${initialSectionKey ?? ""}`
      : null

  const { containerRef, setSectionRef, activeKey, scrollTo } =
    useConsultationScrollTabs({
      enabled: Boolean(groupId && detail),
      initialSectionKey,
      marker: scrollMarker,
    })

  const handleSave = async () => {
    if (!consultationId) {
      MessagePlugin.error("缺少问诊ID，无法保存")
      return
    }
    if (!canSave) {
      MessagePlugin.warning("当前账号无编辑权限")
      return
    }

    const payload: ConsultationEditPayload = { consultationId }
    if (canEditAdvisorMsg) payload.advisorMsg = advisorMsg
    if (canEditDoctorFields) {
      payload.doctorMsg = doctorMsg
      payload.adviceMsg = adviceMsg
    }

    const ok = await runEdit(payload)
    if (!ok) {
      MessagePlugin.error("保存失败")
      return
    }
    MessagePlugin.success("保存成功")
    setDraftMsgs({})
    await reload()
  }

  const statusKey = getText(consultation.status)
  const statusMeta =
    {
      "0": { label: "待问诊", color: "#E37318", dot: "#E37318" },
      "1": { label: "已完成", color: "#2BA471", dot: "#2BA471" },
      "9": { label: "已取消", color: "#999999", dot: "#999999" },
    }[statusKey] ?? { label: "-", color: "#999999", dot: "#999999" }
  const consultNo = getText(
    consultation.consultationNo,
    consultation.consultationNum,
    consultation.consultationId,
    detailRecord.consultationId,
    detailRecord.batchNo
  )
  const consultUserName = getText(
    consultation.userName,
    consultation.username,
    consultation.name
  )
  const consultPatient = getText(
    consultation.patient,
    consultation.patientName,
    consultation.userName,
    consultation.name
  )
  const consultCreateTime = formatDateTime(getText(consultation.createTime))
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

  const advisorValue = canEditAdvisorMsg
    ? advisorMsg
    : advisorMsg.trim()
      ? advisorMsg
      : "-"
  const doctorValue = canEditDoctorFields
    ? doctorMsg
    : doctorMsg.trim()
      ? doctorMsg
      : "-"
  const adviceValue = canEditDoctorFields
    ? adviceMsg
    : adviceMsg.trim()
      ? adviceMsg
      : "-"

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-[#e7e7e7] px-4 py-4">
        <button
          type="button"
          className="flex items-center gap-2 text-[14px] leading-[22px] text-[rgba(0,0,0,0.6)] hover:text-[rgba(0,0,0,0.9)]"
          onClick={onClose}
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

      <ConsultationTabsBar
        activeKey={activeKey}
        enabled={Boolean(groupId && detail && !detailError)}
        onSelect={(key) => scrollTo(key)}
      />

      <div className="min-h-0 flex-1">
        {!groupId ? (
          <div className="h-full px-12 pb-8 pt-6 text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
            请选择群聊后查看问诊详情
          </div>
        ) : detailError ? (
          <div className="flex h-full items-center justify-center px-12 text-[14px] leading-[22px] text-[rgba(0,0,0,0.6)]">
            {detailError instanceof Error
              ? detailError.message
              : "加载失败，请稍后重试"}
          </div>
        ) : loading ? (
          <Loading loading className="h-full" />
        ) : !detail ? (
          <div className="h-full px-12 pb-8 pt-6 text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
            暂无问诊详情
          </div>
        ) : (
          <div
            ref={containerRef}
            className="h-full overflow-y-auto px-12 pb-8 pt-6"
          >
            <div>
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

                <div ref={setSectionRef("questionnaire")} className="mt-8 space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#ecf9f1]">
                      <SvgIcon
                        svg={qtnUserBusinessSvg}
                        className="inline-flex size-4"
                      />
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
                        formatQuestionAnswer(question, {
                          severityLabelMap,
                          onOpenImages: openImages,
                        })
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
                    <div className="space-y-2">
                      <div className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                        健康顾问备注
                      </div>
                      <Textarea
                        value={advisorValue}
                        readonly={!canEditAdvisorMsg}
                        onChange={
                          canEditAdvisorMsg
                            ? (value) =>
                                setDraftMsgs((prev) => ({
                                  ...prev,
                                  advisorMsg: String(value),
                                }))
                            : undefined
                        }
                        autosize={{ minRows: 3, maxRows: 6 }}
                        placeholder={canEditAdvisorMsg ? "请输入健康顾问备注" : "-"}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                        医生诊断
                      </div>
                      <Textarea
                        value={doctorValue}
                        readonly={!canEditDoctorFields}
                        onChange={
                          canEditDoctorFields
                            ? (value) =>
                                setDraftMsgs((prev) => ({
                                  ...prev,
                                  doctorMsg: String(value),
                                }))
                            : undefined
                        }
                        autosize={{ minRows: 3, maxRows: 6 }}
                        placeholder={canEditDoctorFields ? "请输入医生诊断" : "-"}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                        治疗建议
                      </div>
                      <Textarea
                        value={adviceValue}
                        readonly={!canEditDoctorFields}
                        onChange={
                          canEditDoctorFields
                            ? (value) =>
                                setDraftMsgs((prev) => ({
                                  ...prev,
                                  adviceMsg: String(value),
                                }))
                            : undefined
                        }
                        autosize={{ minRows: 3, maxRows: 6 }}
                        placeholder={canEditDoctorFields ? "请输入治疗建议" : "-"}
                      />
                    </div>
                  </div>
                </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-[#e7e7e7] bg-white px-12 py-4">
        <div className="flex items-center justify-between gap-6">
          <div className="text-[12px] leading-[20px] text-[rgba(0,0,0,0.4)]">
            {!groupId
              ? "请选择群聊后查看问诊"
              : !detail
              ? "暂无问诊详情"
              : canSave
              ? "可编辑并保存"
              : "仅可查看"}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="base"
              onClick={onClose}
              className="!h-8 !rounded-[3px] !bg-[#e7e7e7] !px-4 !text-[14px] !leading-[22px] !text-[rgba(0,0,0,0.9)]"
            >
              关闭
            </Button>
            {showSaveButton ? (
              <Button
                theme="primary"
                loading={saving}
                disabled={loading || !hasConsultation}
                onClick={handleSave}
                className="!h-8 !rounded-[3px] !px-4 !text-[14px] !leading-[22px]"
              >
                保存
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <ImageViewerDialog
        key={`${imageViewer.visible}-${imageViewer.images.join("|")}`}
        visible={imageViewer.visible}
        title={imageViewer.title}
        images={imageViewer.images}
        initialIndex={imageViewer.initialIndex}
        onClose={() =>
          setImageViewer((prev) => ({
            ...prev,
            visible: false,
            images: [],
            initialIndex: 0,
          }))
        }
      />
    </div>
  )
}

const AddAdvisorContent = () => {
  const { currentConversation } = useConversationContext()
  const { groups, getGroupMembers } = useAddressContext()
  const groupId =
    currentConversation?.chatType === "groupChat"
      ? currentConversation.conversationId
      : undefined

  const [role, setRole] = useState<3 | 4>(4)
  const [keyword, setKeyword] = useState("")
  const [joiningId, setJoiningId] = useState<number | null>(null)
  const [optimisticJoinedUsernames, setOptimisticJoinedUsernames] = useState<
    Set<string>
  >(() => new Set())

  const memberUsernames = useMemo(() => {
    if (!groupId) return new Set<string>()
    const group = groups.find((item) => {
      const idCandidates = [
        (item as unknown as { groupid?: string }).groupid,
        (item as unknown as { groupId?: string }).groupId,
        (item as unknown as { id?: string }).id,
      ].filter(
        (value): value is string => typeof value === "string" && Boolean(value.trim())
      )
      return idCandidates.some((value) => value === groupId)
    })
    const members = group?.members ?? []
    const usernames = members
      .map((member) =>
        typeof member.userId === "string" ? member.userId.trim() : ""
      )
      .filter(Boolean)
    return new Set(usernames)
  }, [groupId, groups])

  const joinedUsernames = useMemo(() => {
    if (!optimisticJoinedUsernames.size) return memberUsernames
    return new Set([...memberUsernames, ...optimisticJoinedUsernames])
  }, [memberUsernames, optimisticJoinedUsernames])

  useEffect(() => {
    if (!groupId) return
    setOptimisticJoinedUsernames(new Set())
    getGroupMembers?.(groupId, false)
  }, [getGroupMembers, groupId])

  const query = useMemo(
    () => ({
      role: String(role),
      pageNum: 1,
      pageSize: 5000,
    }),
    [role]
  )

  const { data, loading, refresh } = useRequest(() => listEmployees(query), {
    refreshDeps: [JSON.stringify(query)],
  })

  const users = useMemo(() => {
    const list = data?.record ?? []
    const trimmed = keyword.trim()
    if (!trimmed) return list
    const needle = trimmed.toLowerCase()
    return list.filter((user) => {
      const candidates = [
        user.nickName,
        user.username,
        user.phonenumber,
        user.num,
      ]
      return candidates.some((value) => {
        if (typeof value !== "string") return false
        return value.toLowerCase().includes(needle)
      })
    })
  }, [data, keyword])

  const handleJoin = async (user: Employee) => {
    if (!groupId) {
      MessagePlugin.warning("当前会话不是群聊，无法添加成员")
      return
    }
    if (!user.userId) {
      MessagePlugin.error("缺少用户ID")
      return
    }
    const username =
      typeof user.username === "string" ? user.username.trim() : ""
    if (username && joinedUsernames.has(username)) return
    setJoiningId(user.userId)
    try {
      const ok = await joinUserToGroup({ userId: user.userId, hxGroupId: groupId })
      if (ok) {
        MessagePlugin.success("已添加到群组")
        if (username) {
          setOptimisticJoinedUsernames((prev) => new Set(prev).add(username))
        }
        await getGroupMembers?.(groupId, false)
        refresh()
        return
      }
      MessagePlugin.error("添加失败")
    } catch (error) {
      console.log("join2Group failed:", error)
      MessagePlugin.error("添加失败")
    } finally {
      setJoiningId(null)
    }
  }

  if (!groupId) {
    return (
      <div className="p-4">
        <div className="rounded border border-border bg-white p-4 text-sm text-neutral-950/60">
          当前会话不是群聊，无法添加健康顾问/医生。
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <div className="rounded border border-border bg-white p-4">
        <div className="space-y-3">
          <div className="text-sm font-medium text-neutral-950/90">
            添加成员到当前群组
          </div>
          <div className="text-xs text-neutral-950/40">
            群组ID：{groupId}
          </div>
          <Radio.Group
            theme="button"
            variant="outline"
            value={role}
            onChange={(value) => setRole(Number(value) === 3 ? 3 : 4)}
            options={[
              { label: "健康顾问", value: 4 },
              { label: "专业医生", value: 3 },
            ]}
          />
          <Input
            value={keyword}
            onChange={(value) => setKeyword(String(value))}
            placeholder="搜索姓名/手机号"
            clearable
          />
        </div>
      </div>

      <Loading loading={loading}>
        <div className="space-y-3">
          {users.length ? (
            users.map((user, index) => {
              const userId = user.userId ?? 0
              const username =
                typeof user.username === "string" ? user.username.trim() : ""
              const isOnline = user.onlineState === 1
              const isInGroup = Boolean(username) && joinedUsernames.has(username)
              const canJoin = Boolean(userId) && !isInGroup
              const rowKey = String(
                userId || user.username || user.num || user.nickName || index
              )
              return (
                <div
                  key={rowKey}
                  className={`rounded border border-border px-4 py-3 ${
                    isInGroup ? "bg-neutral-50" : "bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex size-2 rounded-full ${
                            isInGroup
                              ? "bg-[#c6c6c6]"
                              : isOnline
                                ? "bg-[#2BA471]"
                                : "bg-[#c6c6c6]"
                          }`}
                        />
                        <span className="truncate text-sm font-medium text-neutral-950/90">
                          {user.nickName ?? user.username ?? "-"}
                        </span>
                      </div>
                      <div
                        className={`mt-1 space-y-0.5 text-xs ${
                          isInGroup ? "text-neutral-400" : "text-neutral-950/40"
                        }`}
                      >
                        <div className="truncate">
                          账号：{user.username ?? "-"}
                        </div>
                        <div className="truncate">编号：{user.num ?? "-"}</div>
                      </div>
                    </div>
                    <Button
                      theme="primary"
                      disabled={!canJoin || joiningId === userId}
                      loading={joiningId === userId}
                      onClick={() => handleJoin(user)}
                      className="!h-8 !rounded-[3px] !px-3 !text-[14px] !leading-[22px]"
                    >
                      {isInGroup ? "已添加" : "添加"}
                    </Button>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="rounded border border-border bg-white p-6 text-center text-sm text-neutral-950/40">
              暂无可添加用户
            </div>
          )}
        </div>
      </Loading>
    </div>
  )
}

const PatientInfoContent = () => {
  return (
    <div className="p-4">
      <div className="text-center text-sm text-neutral-950/40">暂无病人信息</div>
    </div>
  )
}

const TerminateContent = () => {
  return (
    <div className="p-4">
      <div className="text-center text-sm text-neutral-950/40">终止/回绝功能开发中</div>
    </div>
  )
}

const sidebarContent: Record<SidebarTab, FC> = {
  questionnaire: QuestionnaireContent,
  orders: OrdersContent,
  "qtn-records": () => null,
  appointments: AppointmentsContent,
  "appointment-records": AppointmentRecordsContent,
  "add-advisor": AddAdvisorContent,
  "patient-info": PatientInfoContent,
  terminate: TerminateContent,
}

const OrdersDrawer = ({
  visible,
  onClose,
}: {
  visible: boolean
  onClose: () => void
}) => {
  return (
    <Drawer
      visible={visible}
      placement="right"
      size="1000px"
      header={false}
      onClose={onClose}
      closeBtn={false}
      className="order-drawer"
      footer={false}
    >
      {visible ? <OrdersContent onClose={onClose} /> : null}
    </Drawer>
  )
}

const QuestionnaireDrawer = ({
  visible,
  onClose,
  initialSectionKey,
}: {
  visible: boolean
  onClose: () => void
  initialSectionKey?: ConsultationDrawerSection
}) => {
  return (
    <Drawer
      visible={visible}
      placement="right"
      size="760px"
      header={false}
      onClose={onClose}
      closeBtn={false}
      className="qtn-drawer"
      footer={false}
    >
      {visible ? (
        <ChatConsultationDetailContent
          onClose={onClose}
          initialSectionKey={initialSectionKey}
        />
      ) : null}
    </Drawer>
  )
}

export const ChatSidebar: FC<ChatSidebarProps> = ({
  activeTab,
  consultationSection,
  onClose,
}) => {
  const showOrders = activeTab === "orders"
  const showQuestionnaire = activeTab === "questionnaire"
  const showQtnRecords = activeTab === "qtn-records"
  const showPanel =
    Boolean(activeTab) && !showOrders && !showQuestionnaire && !showQtnRecords

  const { currentConversation } = useConversationContext()
  const groupId =
    currentConversation?.chatType === "groupChat"
      ? currentConversation.conversationId
      : undefined

  const ContentComponent = activeTab ? sidebarContent[activeTab] : null

  return (
    <>
      <OrdersDrawer visible={showOrders} onClose={onClose} />
      <QuestionnaireDrawer
        visible={showQuestionnaire}
        onClose={onClose}
        initialSectionKey={consultationSection}
      />
      <QtnRecordsDrawer
        visible={showQtnRecords}
        groupId={groupId}
        onClose={onClose}
      />

      {showPanel && ContentComponent ? (
        <div className="flex h-full w-[358px] flex-shrink-0 flex-col border-l border-border bg-white">
          {/* 侧边栏头部 */}
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <h3 className="text-base font-medium text-neutral-950/90">
              {activeTab ? tabTitles[activeTab] : ""}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="flex size-6 items-center justify-center rounded hover:bg-neutral-950/5"
            >
              <CloseIcon size={16} className="text-neutral-600" />
            </button>
          </div>

          {/* 侧边栏内容 */}
          <div className="flex-1 overflow-y-auto bg-neutral-50">
            <ContentComponent />
          </div>
        </div>
      ) : null}
    </>
  )
}
