import dayjs from "dayjs"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  Button,
  Checkbox,
  Drawer,
  Input,
  Loading,
  MessagePlugin,
  DialogPlugin,
  Radio,
  Select,
  Table,
  Textarea,
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
import {
  buildQuestionSections,
  buildSeverityLabelMap,
  formatQuestionAnswer,
  formatQuestionTitle,
  getQuestionKey,
  ImageViewerDialog,
  TableBlock,
  TruncatedText,
  SvgIcon,
  useScrollTabs,
} from "~/components/qtn/qtn-detail"
import qtnUserBusinessSvg from "~/assets/figma/qtn-user-business.svg?raw"
import qtnInfoSvg from "~/assets/figma/qtn-info.svg?raw"
import { submitQtnAll, submitQtnAnswer } from "~/services/qtn-submit"

const MAX_COMPARE_COUNT = 3
const MAX_QTN_PAGE_SIZE = 100

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

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {}

const normalizeIdString = (value: unknown) => {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed ? trimmed : undefined
  }
  if (typeof value === "number" && !Number.isNaN(value)) {
    return String(value)
  }
  return undefined
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

const buildSelectOptions = (question: QtnQuestion) => {
  if (question.options?.length) {
    return question.options
      .filter((item) => item.optionId !== null && item.optionId !== undefined)
      .map((item) => ({
        label: item.option ?? String(item.optionId),
        value: String(item.optionId),
      }))
  }
  const options = parseTipsOptions(question.tips1)
  if (options.length) {
    return options.map((item) => ({ label: item.label, value: item.key }))
  }
  return []
}

const normalizeInputValue = (value: unknown) => {
  if (value === null || value === undefined) return ""
  const text = String(value)
  return text === "-" ? "" : text
}

const normalizeDraftValueForQuestion = (
  question: QtnQuestion,
  raw: unknown
) => {
  const value = normalizeInputValue(raw)
  if (!value) return ""
  const type = question.type ?? 0
  if (type === 1) {
    if (value === "是") return "1"
    if (value === "否") return "0"
    return value
  }
  if (type === 4 || type === 9) {
    const optionById = question.options?.find(
      (option) => String(option.optionId) === value
    )
    if (optionById?.optionId !== null && optionById?.optionId !== undefined) {
      return String(optionById.optionId)
    }
    const optionByLabel = question.options?.find(
      (option) => option.option === value
    )
    if (
      optionByLabel?.optionId !== null &&
      optionByLabel?.optionId !== undefined
    ) {
      return String(optionByLabel.optionId)
    }
    const tipsOptions = parseTipsOptions(question.tips1)
    const tipByKey = tipsOptions.find((item) => item.key === value)
    if (tipByKey) return tipByKey.key
    const tipByLabel = tipsOptions.find((item) => item.label === value)
    if (tipByLabel) return tipByLabel.key
  }
  return value
}

const QuestionEditor = ({
  question,
  value,
  onChange,
}: {
  question: QtnQuestion
  value: string
  onChange: (next: string) => void
}) => {
  const type = question.type ?? 0
  const selectOptions = buildSelectOptions(question)

  if (type === 1) {
    return (
      <Radio.Group
        value={value}
        onChange={(next) => onChange(String(next))}
        options={[
          { label: "是", value: "1" },
          { label: "否", value: "0" },
        ]}
      />
    )
  }

  if (type === 9 || type === 4) {
    if (!selectOptions.length) {
      return (
        <Input
          value={value}
          onChange={(next) => onChange(String(next))}
          placeholder="请输入"
        />
      )
    }
    return (
      <Radio.Group
        value={value}
        onChange={(next) => onChange(String(next))}
        options={selectOptions}
      />
    )
  }

  if (type === 5) {
    if (!selectOptions.length) {
      return (
        <Input
          value={value}
          onChange={(next) => onChange(String(next))}
          placeholder="请输入"
        />
      )
    }
    const selected = decodeAnswer(value).map((item) => item.optionId)
    return (
      <Checkbox.Group
        value={selected}
        options={selectOptions.map((item) => ({
          label: item.label,
          value: item.value,
        }))}
        onChange={(next) =>
          onChange(
            (next as Array<string | number | boolean>)
              .map((item) => String(item))
              .filter(Boolean)
              .join("|")
          )
        }
      />
    )
  }

  if (type === 6) {
    if (!selectOptions.length) {
      return (
        <Input
          value={value}
          onChange={(next) => onChange(String(next))}
          placeholder="请输入"
        />
      )
    }
    const parsed = decodeAnswer(value)
    const map = new Map<string, string | undefined>()
    parsed.forEach((item) => {
      map.set(item.optionId, item.ext)
    })
    const toggle = (optionId: string, checked: boolean) => {
      const nextMap = new Map(map)
      if (checked) {
        nextMap.set(optionId, nextMap.get(optionId) ?? "1")
      } else {
        nextMap.delete(optionId)
      }
      const nextValue = Array.from(nextMap.entries())
        .map(([id, ext]) => (ext ? `${id}:${ext}` : id))
        .join("|")
      onChange(nextValue)
    }
    const setLevel = (optionId: string, level: string) => {
      const nextMap = new Map(map)
      nextMap.set(optionId, level)
      const nextValue = Array.from(nextMap.entries())
        .map(([id, ext]) => (ext ? `${id}:${ext}` : id))
        .join("|")
      onChange(nextValue)
    }
    return (
      <div className="space-y-2">
        {selectOptions.map((option) => {
          const checked = map.has(option.value)
          const currentLevel = map.get(option.value) ?? "1"
          return (
            <div key={option.value} className="flex items-center gap-3">
              <Checkbox
                checked={checked}
                onChange={(next) => toggle(option.value, Boolean(next))}
              >
                {option.label}
              </Checkbox>
              {checked ? (
                <Select
                  value={currentLevel}
                  className="w-[120px]"
                  options={[1, 2, 3, 4, 5].map((item) => ({
                    label: `程度${item}`,
                    value: String(item),
                  }))}
                  onChange={(next) => setLevel(option.value, String(next))}
                />
              ) : null}
            </div>
          )
        })}
      </div>
    )
  }

  if (type === 11) {
    return (
      <Textarea
        value={value}
        onChange={(next) => onChange(String(next))}
        placeholder="请输入"
        autosize={{ minRows: 3, maxRows: 6 }}
      />
    )
  }

  if (type === 7 || type === 8) {
    return (
      <span className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
        图片类内容暂不支持编辑
      </span>
    )
  }

  return (
    <Input
      value={value}
      onChange={(next) => onChange(String(next))}
      placeholder="请输入"
    />
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

const DiagnosisField = ({ label, value }: { label: string; value: string }) => {
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

const DetailView = ({
  record,
  detail,
  userName,
  onDetailChange,
  onBack,
  onClose,
}: {
  record: QtnRecord
  detail: ConsultationDetail | null
  userName: string
  onDetailChange: (next: ConsultationDetail) => void
  onBack: () => void
  onClose: () => void
}) => {
  const [imageViewer, setImageViewer] = useState<{
    visible: boolean
    title: string
    images: string[]
    initialIndex: number
  }>({ visible: false, title: "", images: [], initialIndex: 0 })
  const qtnMain = useMemo(() => resolveMainFromDetail(detail), [detail])
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
  const { containerRef, setSectionRef, activeKey, scrollTo } =
    useScrollTabs(tabs)
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
    []
  )

  const [isEditing, setIsEditing] = useState(false)
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({})
  const draftRef = useRef<Record<string, string>>({})
  useEffect(() => {
    draftRef.current = draftAnswers
  }, [draftAnswers])

  const { runAsync: runSubmitAll, loading: savingAll } = useRequest(
    submitQtnAll,
    {
      manual: true,
    }
  )
  const { runAsync: runSubmitOne, loading: savingOne } = useRequest(
    submitQtnAnswer,
    { manual: true }
  )
  const isSaving = savingAll || savingOne

  const startEdit = () => {
    const initial: Record<string, string> = {}
    questionSections.forEach((section) => {
      section.questions.forEach((question) => {
        const key = getQuestionKey(question)
        const raw =
          question.userAnswer ?? question.answer ?? question.other ?? ""
        initial[key] = normalizeDraftValueForQuestion(question, raw)
      })
    })
    setDraftAnswers(initial)
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setDraftAnswers({})
  }

  const saveEdit = async () => {
    if (!record.consultationId) {
      MessagePlugin.error("缺少问诊记录ID")
      return
    }
    const mainRecord = toRecord(qtnMain)
    const batchNo =
      typeof mainRecord.batchNo === "string" ? mainRecord.batchNo : undefined
    const consultationRecord = toRecord(detail?.consultation)
    const userAnswerId = normalizeIdString(consultationRecord.userAnswerId)

    const changes: Array<{ question: QtnQuestion; next: string }> = []
    questionSections.forEach((section) => {
      section.questions.forEach((question) => {
        const key = getQuestionKey(question)
        const next = draftRef.current[key] ?? ""
        const original = normalizeInputValue(
          question.userAnswer ?? question.answer ?? question.other ?? ""
        )
        if (next !== original) {
          changes.push({ question, next })
        }
      })
    })

    if (!changes.length) {
      MessagePlugin.info("未检测到修改")
      cancelEdit()
      return
    }

    const answers = changes
      .map(({ question, next }) => {
        if (!question.questionId) return null
        const questionId = Number(question.questionId)
        if (Number.isNaN(questionId)) return null
        const mainId =
          typeof question.mainId === "number" ? question.mainId : undefined
        return {
          questionId,
          mainId,
          answer: next,
          userAnswer: next,
          other: question.other ?? undefined,
          profileField: question.profileField ?? undefined,
          type: question.type ?? undefined,
          sort: question.sort ?? undefined,
          required: question.required ?? undefined,
          batchNo,
          userAnswerId,
        }
      })
      .filter(Boolean) as Array<Record<string, unknown>>

    try {
      await runSubmitAll({
        batchNo,
        userAnswerId,
        answers,
      } as Record<string, unknown>)
    } catch (error) {
      console.log("submitAll failed, fallback submit one by one:", error)
      const results = await Promise.allSettled(
        answers.map((payload) =>
          runSubmitOne(payload as Record<string, unknown>)
        )
      )
      const failed = results.filter((item) => item.status === "rejected")
      if (failed.length) {
        MessagePlugin.error("问卷保存失败，请稍后重试")
        return
      }
    }

    MessagePlugin.success("问卷已保存")
    cancelEdit()
    const refreshed = await getConsultationDetailById(record.consultationId)
    onDetailChange(refreshed)
  }

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
          <div className="flex items-center justify-between gap-4">
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
            {questionSections.length ? (
              isEditing ? (
                <div className="flex items-center gap-2">
                  <Button
                    theme="primary"
                    loading={isSaving}
                    onClick={saveEdit}
                    className="!h-8 !rounded-[3px] !px-4 !text-[14px] !leading-[22px]"
                  >
                    保存
                  </Button>
                  <Button
                    variant="outline"
                    disabled={isSaving}
                    onClick={cancelEdit}
                    className="!h-8 !rounded-[3px] !px-4 !text-[14px] !leading-[22px]"
                  >
                    取消
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={startEdit}
                  className="!h-8 !rounded-[3px] !px-4 !text-[14px] !leading-[22px]"
                >
                  编辑问卷
                </Button>
              )
            ) : null}
          </div>
          {questionSections.length ? (
            questionSections.map((section) => {
              if (!section.questions.length) return null
              const headers = section.questions.map((question) =>
                formatQuestionTitle(question)
              )
              const row = section.questions.map((question) => {
                if (!isEditing) {
                  return formatQuestionAnswer(question, {
                    severityLabelMap,
                    onOpenImages: openImages,
                  })
                }
                const key = getQuestionKey(question)
                return (
                  <QuestionEditor
                    question={question}
                    value={draftAnswers[key] ?? ""}
                    onChange={(next) =>
                      setDraftAnswers((prev) => ({ ...prev, [key]: next }))
                    }
                  />
                )
              })
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
            <DiagnosisField
              label="健康顾问备注"
              value={snapshot.diagnosis[0]}
            />
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
    initialIndex: number
  }>({ visible: false, title: "", images: [], initialIndex: 0 })
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
      {
        key: string
        label: string
        questions: QtnQuestion[]
        keys: Set<string>
      }
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
    []
  )
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
                  formatQuestionAnswer(
                    questionMap?.get(getQuestionKey(question)),
                    {
                      severityLabelMap,
                      onOpenImages: openImages,
                    }
                  )
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
  const { runAsync: runConsultationDetail, loading: detailLoading } =
    useRequest(
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
            fixed: "right",
            cell: ({ row }: { row: QtnRecord }) => (
              <Checkbox
                checked={selected.some(
                  (item) => getRecordKey(item) === getRecordKey(row)
                )}
                disabled={Boolean(selected[0]?.name) && row.name !== selected[0]?.name}
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
            fixed: "right",
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
    <div className="flex-1 min-h-0 overflow-y-auto px-12 py-6">
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
        <div className="overflow-x-auto">
          <Table
            columns={tableColumns}
            tableLayout="fixed"
            className="w-full min-w-full"
            data={filteredRecords}
            rowKey="batchNo"
            loading={loading}
            empty="暂无问诊记录"
          />
        </div>
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
        {view === "list" ? listView : null}
        {view === "detail" && activeRecord ? (
          <DetailView
            record={activeRecord}
            detail={detailData}
            userName={userName ?? "用户"}
            onDetailChange={(next) => setState({ detailData: next })}
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
