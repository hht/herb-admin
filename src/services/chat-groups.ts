import { z } from "zod"

import { request } from "~/hooks/useRequest"

const joinGroupPayloadSchema = z.object({
  userId: z.number(),
  hxGroupId: z.string(),
})

export type JoinGroupPayload = z.infer<typeof joinGroupPayloadSchema>

export const joinUserToGroup = async (payload: JoinGroupPayload) => {
  const parsed = joinGroupPayloadSchema.parse(payload)
  const data = await request<boolean, JoinGroupPayload>(
    "/backend/user/join2Group",
    "POST",
    parsed
  )
  return z.boolean().parse(data)
}

