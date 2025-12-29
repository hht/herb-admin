import type { ConsultationInfo, QtnMain } from "~/services/app-user-qtn"

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

const parseImages = (value?: string | null) => {
  if (!value) return []
  const trimmed = String(value).trim()
  if (!trimmed) return []
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as string[]
      return Array.isArray(parsed) ? parsed.filter(Boolean) : []
    } catch {
      return []
    }
  }
  if (trimmed.includes(",")) {
    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return [trimmed]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const normalizeQuestions = (value: unknown): QtnMain["questions"] => {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is QtnMain["questions"][number] => isRecord(item))
}

const getAllQuestions = (detail?: QtnMain | null) => {
  const direct = normalizeQuestions(detail?.questions)
  if (direct.length) return direct
  const list = Array.isArray(detail?.list) ? detail?.list : []
  const merged: QtnMain["questions"] = []
  list.forEach((step) => {
    if (!isRecord(step)) return
    merged.push(...normalizeQuestions(step.questions))
  })
  return merged
}

const findQuestionByKeywords = (
  questions: QtnMain["questions"],
  keywords: string[]
) =>
  questions.find((item) =>
    keywords.some((key) => item.title?.includes(key))
  )

const parseAnswerSegments = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return []
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (Array.isArray(parsed)) {
        return parsed.flatMap((item) => {
          if (typeof item === "string" || typeof item === "number") {
            return [String(item)]
          }
          if (isRecord(item)) {
            const optionId = item.optionId ?? item.id ?? item.value
            if (typeof optionId === "string" || typeof optionId === "number") {
              const ext = item.ext ?? item.level ?? item.severity
              const suffix =
                typeof ext === "string" || typeof ext === "number"
                  ? `:${ext}`
                  : ""
              return [`${optionId}${suffix}`]
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
}

const getOptionLabel = (
  question: QtnMain["questions"][number],
  value: string
) => {
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

const parseOptionAnswer = (question: QtnMain["questions"][number]) => {
  const raw = question.userAnswer ?? question.answer ?? question.other ?? ""
  const segments = parseAnswerSegments(String(raw))
  return segments.map((segment) => {
    const [optionId, ext] = segment.split(":")
    const label = getOptionLabel(question, optionId)
    const level = ext !== undefined ? Number(ext) : undefined
    return {
      label,
      level: Number.isNaN(level) ? undefined : level,
    }
  })
}

const formatOptionAnswer = (question?: QtnMain["questions"][number]) => {
  if (!question) return "-"
  const entries = parseOptionAnswer(question)
  if (!entries.length) {
    return normalizeAnswer(
      question.userAnswer ?? question.answer ?? question.other ?? "-"
    )
  }
  return entries
    .map((item) => (item.level ? `${item.label}（${item.level}）` : item.label))
    .join("、")
}

const findAnswerByProfile = (
  questions: QtnMain["questions"],
  keys: string[]
) => {
  if (!questions?.length) return "-"
  const target = questions.find((item) =>
    keys.some((key) => item.profileField?.includes(key))
  )
  return normalizeAnswer(target?.userAnswer ?? target?.answer ?? target?.other ?? "-")
}

const findAnswerByKeywords = (
  questions: QtnMain["questions"],
  keywords: string[]
) => {
  if (!questions?.length) return "-"
  const target = findQuestionByKeywords(questions, keywords)
  return normalizeAnswer(target?.userAnswer ?? target?.answer ?? target?.other ?? "-")
}

const findImagesByKeywords = (
  questions: QtnMain["questions"],
  keywords: string[]
) => {
  if (!questions?.length) return []
  const target = questions.find((item) =>
    keywords.some((key) => item.title?.includes(key))
  )
  return parseImages(target?.userAnswer ?? target?.answer ?? target?.other ?? "")
}

export const buildSnapshot = (
  detail?: QtnMain | null,
  consultation?: ConsultationInfo | null
) => {
  const questions = getAllQuestions(detail)
  const severityLabelMap = Object.entries(detail?.symptomLevel ?? {}).reduce<
    Record<number, string>
  >((acc, [key, value]) => {
    const parsedKey = Number(key)
    if (!Number.isNaN(parsedKey) && value) {
      acc[parsedKey] = value
    }
    return acc
  }, {
    1: "感觉正常",
    2: "偶尔感觉不舒服",
    3: "感觉严重",
    4: "感觉很严重",
    5: "感觉非常严重",
  })
  const bodyStatusQuestion = findQuestionByKeywords(questions, ["身体状态"])
  const symptomTags = bodyStatusQuestion
    ? parseOptionAnswer(bodyStatusQuestion).map((item) => ({
        label: item.level
          ? (() => {
              const severityText = severityLabelMap[item.level]
              return severityText ? `${item.label} - ${severityText}` : item.label
            })()
          : item.label,
        level: item.level ?? 0,
      }))
    : Object.entries(detail?.symptomLevel ?? {}).map(([key, value]) => ({
      label: `${key}（${value}）`,
      level: Number(value),
    }))
  const painQuestion = findQuestionByKeywords(questions, ["疼痛"])
  const gyneQuestion = findQuestionByKeywords(questions, ["妇科", "月经"])
  const painTags = painQuestion
    ? parseOptionAnswer(painQuestion).map((item) => ({
        label: item.level
          ? (() => {
              const severityText = severityLabelMap[item.level]
              return severityText ? `${item.label} - ${severityText}` : item.label
            })()
          : item.label,
        level: item.level ?? 0,
      }))
    : []
  const gyneTags = gyneQuestion
    ? parseOptionAnswer(gyneQuestion).map((item) => ({
        label: item.level
          ? (() => {
              const severityText = severityLabelMap[item.level]
              return severityText ? `${item.label} - ${severityText}` : item.label
            })()
          : item.label,
        level: item.level ?? 0,
      }))
    : []

  const historyUploads = findImagesByKeywords(questions, ["病例上传", "病例"])

  return {
    baseInfo: [
      findAnswerByProfile(questions, ["sex"]),
      findAnswerByProfile(questions, ["age"]),
      findAnswerByProfile(questions, ["height"]),
      findAnswerByProfile(questions, ["weight"]),
    ],
    vitals: [
      findAnswerByProfile(questions, ["dia"]),
      findAnswerByProfile(questions, ["sys"]),
      findAnswerByProfile(questions, ["hr"]),
      findAnswerByProfile(questions, ["bg"]),
    ],
    images: [
      findImagesByKeywords(questions, ["脸", "面部"]),
      findImagesByKeywords(questions, ["舌苔", "舌"]),
      findImagesByKeywords(questions, ["左手"]),
      findImagesByKeywords(questions, ["右手"]),
      findImagesByKeywords(questions, ["小便", "尿"]),
    ],
    history: [
      findAnswerByKeywords(questions, [
        "既往病史",
        "既往病例",
        "即往病例",
        "既往",
        "过敏史",
        "家族史",
      ]),
      historyUploads.length ? "查看图片" : "-",
      findAnswerByKeywords(questions, ["病情", "描述"]),
      findAnswerByKeywords(questions, ["药物", "用药"]),
    ],
    historyUploads,
    habits: [
      findAnswerByKeywords(questions, ["饮食"]),
      findAnswerByKeywords(questions, ["作息"]),
      findAnswerByKeywords(questions, ["生活习惯", "生活环境"]),
      findAnswerByKeywords(questions, ["工作环境", "手机"]),
      findAnswerByKeywords(questions, ["情绪"]),
    ],
    complexion: [
      findAnswerByKeywords(questions, ["面色"]),
      findAnswerByKeywords(questions, ["手部"]),
      findAnswerByKeywords(questions, ["脚部"]),
      findAnswerByKeywords(questions, ["流汗"]),
      findAnswerByKeywords(questions, ["寒热"]),
      findAnswerByKeywords(questions, ["胃口"]),
    ],
    status: [
      formatOptionAnswer(bodyStatusQuestion),
      formatOptionAnswer(painQuestion),
      formatOptionAnswer(gyneQuestion),
    ],
    statusTags: [symptomTags, painTags, gyneTags],
    diagnosis: [
      consultation?.advisorMsg ??
        findAnswerByKeywords(questions, ["健康顾问备注"]),
      consultation?.doctorMsg ??
        findAnswerByKeywords(questions, ["医生诊断"]),
      consultation?.adviceMsg ??
        findAnswerByKeywords(questions, ["治疗建议"]),
    ],
    symptomTags,
  }
}
