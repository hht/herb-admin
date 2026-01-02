import { z } from "zod"

import { request } from "~/hooks/useRequest"

const qtnAnswerSchema = z
  .object({
    questionId: z.number(),
    mainId: z.number().nullable().optional(),
    answer: z.string().nullable().optional(),
    userAnswer: z.string().nullable().optional(),
    other: z.string().nullable().optional(),
    profileField: z.string().nullable().optional(),
    type: z.number().nullable().optional(),
    sort: z.number().nullable().optional(),
    required: z.number().nullable().optional(),
    step: z.number().nullable().optional(),
    batchNo: z.string().nullable().optional(),
    userAnswerId: z.string().nullable().optional(),
  })
  .passthrough()

export type QtnAnswerSubmitPayload = z.infer<typeof qtnAnswerSchema>

const qtnSubmitAllSchema = z
  .object({
    batchNo: z.string().nullable().optional(),
    userAnswerId: z.string().nullable().optional(),
    answers: z.array(qtnAnswerSchema).default([]),
  })
  .passthrough()

export type QtnSubmitAllPayload = z.infer<typeof qtnSubmitAllSchema>

export const submitQtnAnswer = async (payload: QtnAnswerSubmitPayload) => {
  const parsed = qtnAnswerSchema.parse(payload)
  return await request<unknown, QtnAnswerSubmitPayload>(
    "/app/qtn/submit",
    "POST",
    parsed
  )
}

export const submitQtnAll = async (payload: QtnSubmitAllPayload) => {
  const parsed = qtnSubmitAllSchema.parse(payload)
  return await request<unknown, QtnSubmitAllPayload>(
    "/app/qtn/submitAll",
    "POST",
    parsed
  )
}
