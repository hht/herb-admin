import { z } from "zod"

import { request } from "~/hooks/useRequest"

const appUserSchema = z.object({
  userId: z.number().nullable().optional(),
  username: z.string().nullable().optional(),
  nickName: z.string().nullable().optional(),
  phonenumber: z.string().nullable().optional(),
  sex: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  state: z.number().nullable().optional(),
  createTime: z.string().nullable().optional(),
  age: z.number().nullable().optional(),
  height: z.string().nullable().optional(),
  weight: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  areaCode: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
})

const pageSchema = z.object({
  record: z.array(appUserSchema).default([]),
  total: z.number().default(0),
  pageNum: z.number().default(1),
  pageSize: z.number().default(20),
})

export type AppUser = z.infer<typeof appUserSchema>
export type AppUserPage = z.infer<typeof pageSchema>

export interface AppUserQuery {
  nickName?: string
  username?: string
  role?: string
  userId?: string | number
  pageNum?: number
  pageSize?: number
}

export interface AppUserInput {
  userId: number
  areaCode?: string
  username: string
  nickName?: string
  phonenumber?: string
  sex?: string
  age?: number
  height?: string
  weight?: string
  address?: string
  status?: string
  state?: number
  role?: string
}

export const listAppUsers = async (
  params: AppUserQuery
): Promise<AppUserPage> => {
  const data = await request<AppUserPage, AppUserQuery>(
    "/backend/user/appUser/list",
    "GET",
    params
  )
  return pageSchema.parse(data)
}

export const updateAppUser = async (payload: AppUserInput) =>
  await request<AppUser, AppUserInput>(
    "/backend/user/appUser/edit",
    "POST",
    payload
  )

export const getAppUserDetail = async (userId: number) =>
  await request<AppUser, Record<string, never>>(
    `/backend/user/appUser/detail/${userId}`,
    "GET"
  )
