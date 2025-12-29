import { useEffect, useMemo, useRef, useState } from "react"
import { rootStore, useConversationContext } from "easemob-chat-uikit"
import { CloseIcon, EditIcon } from "tdesign-icons-react"
import {
  Button,
  Drawer,
  Form,
  Input,
  InputAdornment,
  Loading,
  MessagePlugin,
  Select,
  Textarea,
} from "tdesign-react"
import { shallow } from "zustand/shallow"

import type { FC, ReactNode } from "react"

import { useRequest } from "~/hooks/useRequest"
import qtnUserBusinessSvg from "~/assets/figma/qtn-user-business.svg?raw"
import qtnViewSvg from "~/assets/figma/qtn-view.svg?raw"
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

export type SidebarTab =
  | "questionnaire"
  | "orders"
  | "appointments"
  | "appointment-records"
  | "add-advisor"
  | "patient-info"
  | "terminate"

interface ChatSidebarProps {
  activeTab: SidebarTab | null
  onClose: () => void
}

const tabTitles: Record<SidebarTab, string> = {
  questionnaire: "问卷",
  orders: "创建订单",
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

const QuestionnaireContent = () => {
  return (
    <div className="space-y-3 p-4">
      {/* 示例问卷卡片 */}
      <div className="rounded border border-border bg-neutral-special-light p-3">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-950/90">
                病患名称+创建时间（名称）
              </span>
            </div>
            <div className="text-xs text-neutral-950/40">更新时间</div>
          </div>
        </div>
        <div className="mb-2 text-xs text-neutral-600">
          是否为自己已的问卷
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded bg-white px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-950/5"
          >
            查看详情/修改
          </button>
          <button
            type="button"
            className="rounded bg-primary px-4 py-1.5 text-xs text-white hover:bg-primary-600"
          >
            发送
          </button>
        </div>
      </div>

      <div className="rounded border border-border bg-neutral-special-light p-3">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-950/90">
                病患名称+创建时间（名称）
              </span>
            </div>
            <div className="text-xs text-neutral-950/40">更新时间</div>
          </div>
        </div>
        <div className="mb-2 text-xs text-neutral-600">
          是否为自己已的问卷
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded bg-white px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-950/5"
          >
            查看详情/修改
          </button>
          <button
            type="button"
            className="rounded bg-primary px-4 py-1.5 text-xs text-white hover:bg-primary-600"
          >
            发送
          </button>
        </div>
      </div>
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

const OrdersContent = () => {
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

  const { data, loading } = useRequest(
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
      .filter((item): item is string => !!item && item.trim())
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

  const handleTemplateChange = (value: number | string) => {
    if (value === null || value === undefined || value === "") {
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

  const getId = (...values: unknown[]) => {
    for (const value of values) {
      if (typeof value === "number" && !Number.isNaN(value)) return value
      if (typeof value === "string" && value.trim()) {
        const parsed = Number(value)
        if (!Number.isNaN(parsed)) return parsed
      }
    }
    return undefined
  }

  const toRecord = (value: unknown) =>
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {}
  const normalizeMain = (value: unknown) => {
    const record = toRecord(value)
    return record
  }
  const resolveMainFromDetail = (detail: unknown) => {
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
    return normalizeMain(target)
  }
  const resolveMainFirst = (detail: unknown) => {
    const main = resolveMainFromDetail(detail)
    const record = toRecord(main)
    const list = record.list
    if (Array.isArray(list) && list.length > 0) {
      return toRecord(list[0])
    }
    return record
  }
  const consultation = useMemo(() => {
    if (consultationDetail?.consultation) {
      return toRecord(consultationDetail.consultation)
    }
    return toRecord(consultationDetail)
  }, [consultationDetail])

  const qtnMain = useMemo(
    () => resolveMainFromDetail(consultationDetail),
    [consultationDetail]
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
  }, [qtnMain])

  const qtnMainFirst = useMemo(
    () => resolveMainFirst(consultationDetail),
    [consultationDetail]
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
  }, [qtnMain])
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
        .filter((item): item is string => !!item && item.trim())
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
        const stepTips = sanitizeTips([stepRecord.tips1, stepRecord.tips2])
        if (!stepQuestions.length) return
        buildSections(stepQuestions, `step-${stepIndex}`, stepTips)
      })
      return sections
    }
    if (questions.length) {
      buildSections(questions, "default")
    }
    return sections
  }, [qtnMain, questions])

  useEffect(() => {
    if (!consultationDetail) return
    const userAnswerId = getId(
      consultation.userAnswerId,
      consultation.answerId,
      consultation.consultationId,
      qtnMainFirst.id,
      qtnMainFirst.mainId,
      qtnMainFirst.qtnMainId
    )
    if (userAnswerId && !form.getFieldValue("userAnswerId")) {
      form.setFieldsValue({ userAnswerId: String(userAnswerId) })
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
    const userAnswerId = getId(
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
    const fromUser = getText(rootStore.client?.user)
    const messageId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    rootStore.messageStore.sendMessage({
      id: messageId,
      type: "custom",
      chatType: "groupChat",
      to: groupId,
      from: fromUser,
      time: Date.now(),
      customEvent: "custom_event",
      customExts: {
        custom_key: "custom_value",
      },
      ext: {
        orderId: result.orderId ?? undefined,
        orderNum: result.orderNum ?? undefined,
        title: "创建订单",
        status: 1,
      },
    })
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <Loading loading={loading || consultationLoading} size="small">
        <div className="flex h-full flex-col">
          <Form
            form={form}
            labelAlign="top"
            layout="vertical"
            colon={false}
            className="flex h-full flex-col"
          >
            <div className="flex-1 overflow-hidden">
              <div className="flex h-full">
                <div className="flex-1 overflow-y-auto">
                  <div className="border-b border-[#e7e7e7]">
                    <div className="px-[23px]">
                      <div className="flex h-[60px] items-center border-b border-[#e7e7e7] text-[16px] font-semibold leading-[24px] text-[rgba(0,0,0,0.9)]">
                        问卷
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
                            <div className="mt-2 min-h-[124px] rounded-[3px] border border-[#dcdcdc] bg-white px-2 py-[5px] text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)] whitespace-pre-wrap">
                              {block.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-[360px] shrink-0 border-l border-[#e7e7e7]">
                  <div className="flex h-full flex-col">
                    <div className="flex-1 overflow-y-auto px-6 pb-6 pt-6">
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
                  <span className="text-[rgba(0,0,0,0.9)]">选择病种</span>
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

              {isEditing ? (
                <div className="w-[312px] border-t border-[#e7e7e7] px-4 py-6">
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-0.5 pb-2 text-[14px] leading-[22px]">
                        <span className="text-[rgba(0,0,0,0.9)]">套餐名</span>
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

                    <div className="space-y-4">
                      {contents.map((service, index) => {
                        const isRequired = index === 0
                        return (
                          <div key={service.title ?? index} className="space-y-2">
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
                          <InputAdornment className="w-full" append="人民币">
                            <Input placeholder="请填写价格" />
                          </InputAdornment>
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
                          <InputAdornment className="w-full" append="人民币">
                            <Input placeholder="请填写价格" />
                          </InputAdornment>
                        </Form.FormItem>
                      </div>
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
              ) : (
                <div className="w-[312px] pb-6">
                  <div className="flex items-center gap-0.5 pb-2 text-[14px] leading-[22px]">
                    <span className="text-[rgba(0,0,0,0.9)]">选择套餐</span>
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
              )}

              {!isEditing && hasPackage ? (
                <div className="w-[312px] border-t border-[#e7e7e7] px-4 py-6">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      {contents.map((service, index) => (
                        <div key={service.title ?? index} className="space-y-1">
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

              {!isEditing ? (
                <>
                  <Form.FormItem name="price" className="hidden">
                    <Input />
                  </Form.FormItem>
                  <Form.FormItem name="originalPrice" className="hidden">
                    <Input />
                  </Form.FormItem>
                </>
              ) : null}
              <Form.FormItem name="packageName" className="hidden">
                <Input />
              </Form.FormItem>
              <Form.FormItem name="userAnswerId" className="hidden">
                <Input />
              </Form.FormItem>
                    </div>
                    {hasPackage && !isEditing ? (
                      <div className="flex h-[60px] items-center gap-2 border-t border-[#e7e7e7] bg-white px-4">
                        <Button
                          theme="primary"
                          loading={createLoading}
                          onClick={handleSubmit}
                          className="!h-8 !rounded-[3px] !px-4 !text-[14px] !leading-[22px]"
                        >
                          发送订单
                        </Button>
                        <Button
                          variant="base"
                          onClick={handleReset}
                          className="!h-8 !rounded-[3px] !bg-[#e7e7e7] !px-4 !text-[14px] !leading-[22px] !text-[rgba(0,0,0,0.9)]"
                        >
                          取消
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </Form>
        </div>
      </Loading>
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

const AddAdvisorContent = () => {
  return (
    <div className="p-4">
      <div className="text-center text-sm text-neutral-950/40">添加健康顾问功能开发中</div>
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
      header="创建订单"
      onClose={onClose}
      closeBtn
      className="order-drawer"
      footer={false}
    >
      <OrdersContent />
    </Drawer>
  )
}

export const ChatSidebar: FC<ChatSidebarProps> = ({ activeTab, onClose }) => {
  if (!activeTab) return null
  if (activeTab === "orders") {
    return <OrdersDrawer visible onClose={onClose} />
  }

  const ContentComponent = sidebarContent[activeTab]

  return (
    <div className="flex h-full w-[358px] flex-shrink-0 flex-col border-l border-border bg-white">
      {/* 侧边栏头部 */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <h3 className="text-base font-medium text-neutral-950/90">
          {tabTitles[activeTab]}
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
  )
}
