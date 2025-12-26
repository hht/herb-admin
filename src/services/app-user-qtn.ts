import { z } from "zod"

import { request } from "~/hooks/useRequest"

const qtnRecordSchema = z.object({
  answerId: z.number().nullable().optional(),
  batchNo: z.string().nullable().optional(),
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
  title: z.string().nullable().optional(),
  type: z.number().nullable().optional(),
  userAnswer: z.string().nullable().optional(),
  profileField: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  other: z.string().nullable().optional(),
  options: z.array(qtnOptionSchema).default([]),
})

const qtnMainSchema = z.object({
  batchNo: z.string().nullable().optional(),
  createTime: z.string().nullable().optional(),
  step: z.number().nullable().optional(),
  type: z.number().nullable().optional(),
  title: z.string().nullable().optional(),
  symptomLevel: z.record(z.string()).nullable().optional(),
  questions: z.array(qtnQuestionSchema).default([]),
})

const consultationSchema = z
  .object({
    consultationId: z.number().nullable().optional(),
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

export interface QtnRecordQuery {
  userId: number
  pageNum?: number
  pageSize?: number
}

export const listAppUserQtn = async (
  params: QtnRecordQuery
): Promise<QtnRecordPage> => {
  const data = await request<QtnRecordPage, QtnRecordQuery>(
    "/backend/user/appUser/qtn/list",
    "GET",
    params
  )
  return pageSchema.parse(data)
}

export const getConsultationDetail = async (batchNo: string) => {
  const data = await request<ConsultationDetail, { batchNo: string }>(
    "/backend/user/appUser/qtn/detail",
    "GET",
    { batchNo }
  )
  return consultationDetailSchema.parse(data)
}
