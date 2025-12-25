import { z } from "zod"

import { request } from "~/hooks/useRequest"

const healthContentSchema = z.object({
  title: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
})

const healthTemplateSchema = z.object({
  packageId: z.number().nullable().optional(),
  name: z.string().nullable().optional(),
  disease: z.string().nullable().optional(),
  price: z.number().nullable().optional(),
  originalPrice: z.number().nullable().optional(),
  status: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  contents: z.array(healthContentSchema).default([]),
  createTime: z.string().nullable().optional(),
  updateTime: z.string().nullable().optional(),
})

const pageSchema = z.object({
  record: z.array(healthTemplateSchema).default([]),
  total: z.number().default(0),
  pageNum: z.number().default(1),
  pageSize: z.number().default(20),
  pages: z.number().nullable().optional(),
})

export type HealthContent = z.infer<typeof healthContentSchema>
export type HealthTemplate = z.infer<typeof healthTemplateSchema>
export type HealthTemplatePage = z.infer<typeof pageSchema>

export interface HealthTemplateQuery {
  name?: string
  disease?: string
  status?: string
  pageNum?: number
  pageSize?: number
}

export interface HealthContentInput {
  title?: string
  name?: string
  content?: string
}

export interface HealthTemplateInput {
  packageId?: number
  name: string
  disease?: string
  price?: number
  originalPrice?: number
  status?: string
  content?: string
  contents?: HealthContentInput[]
}

export const listHealthTemplates = async (
  params: HealthTemplateQuery
): Promise<HealthTemplatePage> => {
  const data = await request<HealthTemplatePage, HealthTemplateQuery>(
    "/backend/healthTemplate/list",
    "GET",
    params
  )
  return pageSchema.parse(data)
}

export const createHealthTemplate = async (payload: HealthTemplateInput) =>
  await request<HealthTemplate, HealthTemplateInput>(
    "/backend/healthTemplate/create",
    "POST",
    payload
  )

export const updateHealthTemplate = async (payload: HealthTemplateInput) =>
  await request<HealthTemplate, HealthTemplateInput>(
    "/backend/healthTemplate/edit",
    "POST",
    payload
  )

export const deleteHealthTemplate = async (packageId: number) =>
  await request(`/backend/healthTemplate/delete/${packageId}`, "DELETE")

export const getHealthTemplateDetail = async (packageId: number) =>
  await request<HealthTemplate, Record<string, never>>(
    `/backend/healthTemplate/detail/${packageId}`,
    "GET"
  )
