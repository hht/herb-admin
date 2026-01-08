import { z } from "zod"

import { request } from "~/hooks/useRequest"

const arrayOrEmpty = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (Array.isArray(value) ? value : []), z.array(schema))

const qtnRecordSchema = z.object({
  consultationId: z.number().nullable().optional(),
  answerId: z.number().nullable().optional(),
  batchNo: z.preprocess(
    (value) => {
      if (value === null || typeof value === "undefined") return value
      if (typeof value === "string") return value
      if (typeof value === "number" && !Number.isNaN(value)) return String(value)
      return value
    },
    z.string().nullable().optional()
  ),
  userId: z.number().nullable().optional(),
  name: z.string().nullable().optional(),
  symptom: z.string().nullable().optional(),
  createDate: z.string().nullable().optional(),
  updateDate: z.string().nullable().optional(),
  createTime: z.string().nullable().optional(),
  updateTime: z.string().nullable().optional(),
  isCheck: z.number().nullable().optional(),
})

const qtnOptionSchema = z.object({
  option: z.string().nullable().optional(),
  optionId: z.number().nullable().optional(),
})

const qtnQuestionSchema = z.object({
  mainId: z.number().nullable().optional(),
  questionId: z.number().nullable().optional(),
  sort: z.number().nullable().optional(),
  title: z.string().nullable().optional(),
  type: z.number().nullable().optional(),
  userAnswer: z.string().nullable().optional(),
  answer: z.string().nullable().optional(),
  tips1: z.string().nullable().optional(),
  tips2: z.string().nullable().optional(),
  profileField: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  other: z.string().nullable().optional(),
  required: z.number().nullable().optional(),
  options: arrayOrEmpty(qtnOptionSchema),
}).passthrough()

const qtnMainSchema = z.object({
  id: z.number().nullable().optional(),
  mainId: z.number().nullable().optional(),
  batchNo: z.preprocess(
    (value) => {
      if (value === null || typeof value === "undefined") return value
      if (typeof value === "string") return value
      if (typeof value === "number" && !Number.isNaN(value)) return String(value)
      return value
    },
    z.string().nullable().optional()
  ),
  createTime: z.string().nullable().optional(),
  step: z.number().nullable().optional(),
  type: z.number().nullable().optional(),
  title: z.string().nullable().optional(),
  tips1: z.string().nullable().optional(),
  tips2: z.string().nullable().optional(),
  symptomLevel: z.record(z.string(), z.string()).nullable().optional(),
  questions: arrayOrEmpty(qtnQuestionSchema),
  list: arrayOrEmpty(z.unknown()),
})

const consultationSchema = z
  .object({
    consultationId: z.number().nullable().optional(),
    userAnswerId: z.preprocess(
      (value) => {
        if (value === null || typeof value === "undefined") return value
        if (typeof value === "string") return value
        if (typeof value === "number" && !Number.isNaN(value)) return String(value)
        return value
      },
      z.string().nullable().optional()
    ),
    advisorMsg: z.string().nullable().optional(),
    doctorMsg: z.string().nullable().optional(),
    adviceMsg: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
  })
  .passthrough()

const consultationDetailSchema = z.object({
  consultation: consultationSchema.nullable().optional(),
  qtnMainVO: qtnMainSchema.nullable().optional(),
})

const consultationListSchema = z
  .object({
    consultation: consultationSchema.nullable().optional(),
    qtnMainVO: z.unknown().nullable().optional(),
  })
  .passthrough()

const listPageSchema = z.object({
  record: z.array(consultationListSchema).default([]),
  total: z.number().default(0),
  pageNum: z.number().default(1),
  pageSize: z.number().default(20),
})

const pageSchema = z.object({
  record: z.array(qtnRecordSchema).default([]),
  total: z.number().default(0),
  pageNum: z.number().default(1),
  pageSize: z.number().default(20),
})

export type QtnRecord = z.infer<typeof qtnRecordSchema>
export type QtnQuestion = z.infer<typeof qtnQuestionSchema>
export type QtnMain = z.infer<typeof qtnMainSchema>
export type QtnRecordPage = z.infer<typeof pageSchema>
export type ConsultationInfo = z.infer<typeof consultationSchema>
export type ConsultationDetail = z.infer<typeof consultationDetailSchema>
export type ConsultationListItem = z.infer<typeof consultationListSchema>

export interface QtnRecordQuery {
  userId: number
  pageNum?: number
  pageSize?: number
}

export interface QtnRecordGroupQuery {
  groupId: string
  pageNum?: number
  pageSize?: number
}

const getString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value
    if (typeof value === "number" && !Number.isNaN(value)) return String(value)
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

const getMain = (value: unknown) => {
  if (!value || typeof value !== "object") return {}
  const record = value as Record<string, unknown>
  const list = record.list
  if (Array.isArray(list) && list.length > 0 && typeof list[0] === "object") {
    return list[0] as Record<string, unknown>
  }
  return record
}

const toRecord = (item: ConsultationListItem): QtnRecord => {
  const itemRecord = item as Record<string, unknown>
  const consultation = (itemRecord.consultation ?? itemRecord) as Record<
    string,
    unknown
  >
  const mainRecord =
    itemRecord.qtnMainVO ?? itemRecord.qtnMainVo ?? itemRecord.qtnMain ?? itemRecord
  const main = getMain(mainRecord)
  const mainBatchNo =
    mainRecord && typeof mainRecord === "object"
      ? (mainRecord as Record<string, unknown>).batchNo
      : undefined
  return qtnRecordSchema.parse({
    consultationId: getNumber(
      consultation.consultationId,
      main.consultationId,
      itemRecord.consultationId
    ),
    answerId: getNumber(
      consultation.answerId,
      consultation.consultationId
    ),
    batchNo: getString(
      mainBatchNo,
      main.batchNo,
      consultation.batchNo,
      consultation.userAnswerId,
      consultation.answerId,
      consultation.consultationId
    ),
    userId: getNumber(consultation.userId, main.userId),
    name: getString(
      consultation.userName,
      consultation.name,
      consultation.nickName,
      main.userName,
      main.name,
      main.nickName
    ),
    symptom: getString(
      consultation.symptom,
      main.symptom,
      main.symptomName
    ),
    createDate: getString(consultation.createDate, main.createDate),
    updateDate: getString(consultation.updateDate, main.updateDate),
    createTime: getString(consultation.createTime, main.createTime),
    updateTime: getString(consultation.updateTime, main.updateTime),
    isCheck: getNumber(consultation.isCheck, main.isCheck),
  })
}

export const listAppUserQtn = async (
  params: QtnRecordQuery
): Promise<QtnRecordPage> => {
  const data = await request<
    z.infer<typeof listPageSchema>,
    QtnRecordQuery
  >("/backend/consultation/listByUser", "GET", params)
  const parsed = listPageSchema.parse(data)
  const record = parsed.record.map(toRecord)
  return pageSchema.parse({
    ...parsed,
    record,
  })
}

export const listConsultationQtnByGroupId = async (
  params: QtnRecordGroupQuery
): Promise<QtnRecordPage> => {
  const data = await request<
    z.infer<typeof listPageSchema>,
    QtnRecordGroupQuery
  >("/backend/consultation/listByGroupId", "GET", params)
  const parsed = listPageSchema.parse(data)
  const record = parsed.record.map(toRecord)
  return pageSchema.parse({
    ...parsed,
    record,
  })
}

export const getConsultationDetail = async (batchNo: string) => {
  const data = await request<ConsultationDetail, { batchNo: string }>(
    "/backend/user/appUser/qtn/detail",
    "GET",
    { batchNo }
  )
  const record = data as Record<string, unknown>
  if (record && typeof record === "object") {
    return consultationDetailSchema.parse({
      consultation: record.consultation ?? record,
      qtnMainVO: record.qtnMainVO ?? record.qtnMainVo ?? record.qtnMain,
    })
  }
  return consultationDetailSchema.parse(data)
}

export const getConsultationDetailByGroupId = async (groupId: string) => {
  const data = await request<ConsultationDetail, Record<string, never>>(
    `/backend/consultation/detailByGroupId/${groupId}`,
    "GET"
  )
  const record = data as Record<string, unknown>
  if (record && typeof record === "object") {
    return consultationDetailSchema.parse({
      consultation: record.consultation ?? record,
      qtnMainVO: record.qtnMainVO ?? record.qtnMainVo ?? record.qtnMain,
    })
  }
  return consultationDetailSchema.parse(data)
}

export const getConsultationDetailById = async (consultationId: number) => {
  const data = await request<ConsultationDetail, Record<string, never>>(
    `/backend/consultation/detail/${consultationId}`,
    "GET"
  )
  const record = data as Record<string, unknown>
  if (record && typeof record === "object") {
    return consultationDetailSchema.parse({
      consultation: record.consultation ?? record,
      qtnMainVO: record.qtnMainVO ?? record.qtnMainVo ?? record.qtnMain,
    })
  }
  return consultationDetailSchema.parse(data)
}
