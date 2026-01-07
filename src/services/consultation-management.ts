import { z } from "zod"

import { request } from "~/hooks/useRequest"

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {}

const getString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
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

export interface ConsultationListQuery {
  pageNum: number
  pageSize: number
  userName?: string
  doctorId?: number
  status?: string
  startTime?: string
  endTime?: string
}

export type ConsultationRow = {
  consultationId?: number
  consultationNo?: string
  userId?: number
  userName?: string
  patientName?: string
  doctorName?: string
  consultationTime?: string
  status?: string
  raw: unknown
}

export interface ConsultationPage {
  record: ConsultationRow[]
  total: number
  pageNum: number
  pageSize: number
}

const pageSchema = z.object({
  record: z.array(z.unknown()).default([]),
  total: z.number().default(0),
  pageNum: z.number().default(1),
  pageSize: z.number().default(20),
})

const normalizeRow = (value: unknown): ConsultationRow => {
  const item = toRecord(value)
  const consultation = toRecord(item.consultation ?? value)

  const consultationId = getNumber(
    consultation.consultationId,
    item.consultationId,
    consultation.id,
    item.id
  )
  const consultationNo = getString(
    consultation.consultationNo,
    consultation.consultationNum,
    consultation.consultationCode,
    consultation.consultationId,
    item.consultationNo,
    item.consultationNum,
    item.consultationCode,
    item.consultationId
  )
  const userId = getNumber(consultation.userId, item.userId)
  const userName = getString(
    consultation.userName,
    consultation.username,
    consultation.nickName,
    item.userName,
    item.username,
    item.nickName
  )
  const patientName = getString(
    consultation.patientName,
    consultation.patient,
    item.patientName,
    item.patient
  )
  const doctorName = getString(
    consultation.doctorName,
    consultation.doctorUserName,
    consultation.doctor,
    item.doctorName,
    item.doctorUserName,
    item.doctor
  )
  const consultationTime = getString(
    consultation.consultationTime,
    consultation.visitTime,
    consultation.startTime,
    consultation.createTime,
    item.consultationTime,
    item.visitTime,
    item.startTime,
    item.createTime
  )
  const status = getString(consultation.status, item.status)

  return {
    consultationId,
    consultationNo,
    userId,
    userName,
    patientName,
    doctorName,
    consultationTime,
    status,
    raw: value,
  }
}

export const listConsultations = async (
  query: ConsultationListQuery
): Promise<ConsultationPage> => {
  const data = await request<z.infer<typeof pageSchema>, ConsultationListQuery>(
    "/backend/consultation/list",
    "GET",
    query
  )
  const parsed = pageSchema.parse(data)
  return {
    ...parsed,
    record: parsed.record.map(normalizeRow),
  }
}

