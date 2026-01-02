import { z } from "zod"

import { request } from "~/hooks/useRequest"

const consultationEditSchema = z.object({
  consultationId: z.number(),
  advisorMsg: z.string().nullable().optional(),
  doctorMsg: z.string().nullable().optional(),
  adviceMsg: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
})

export type ConsultationEditPayload = z.infer<typeof consultationEditSchema>

export const editConsultation = async (payload: ConsultationEditPayload) => {
  const parsed = consultationEditSchema.parse(payload)
  const data = await request<boolean, ConsultationEditPayload>(
    "/backend/consultation/edit",
    "POST",
    parsed
  )
  return z.boolean().parse(data)
}

