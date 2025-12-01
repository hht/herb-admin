import { z } from "zod"

import { request } from "~/hooks/useRequest"

export const loginFormSchema = z.object({
  username: z.string("请输入账号").min(1, "请输入账号"),
  password: z.string("请输入密码").min(1, "请输入密码"),
})

export type LoginFormValues = z.infer<typeof loginFormSchema>

const loginResponseSchema = z.object({
  token: z.string(),
  expireSeconds: z.number().optional(),
  hxPassword: z.string().optional(),
  hxUserName: z.string().optional(),
  hxUuid: z.string().optional(),
})

export type LoginSession = z.infer<typeof loginResponseSchema>

export const login = async (payload: LoginFormValues) => {
  const data = await request<
    LoginSession,
    {
      username: string
      password: string
      type: number
    }
  >("/login", "POST", {
    ...payload,
    type: 1,
  })

  return loginResponseSchema.parse(data)
}
