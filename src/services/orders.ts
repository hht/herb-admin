import { z } from "zod"

import { request } from "~/hooks/useRequest"

export interface OrderContentInput {
  title?: string
  name?: string
  content?: string
}

export interface OrderCreateInput {
  userAnswerId: string
  packageName: string
  price: number
  contents: OrderContentInput[]
  disease?: string
  originalPrice?: number
  userId?: number
  userName?: string
}

export interface OrderDetailQuery {
  orderId?: number
  orderNum?: string
}

export interface OrderListQuery {
  pageNum?: number
  pageSize?: number
  userName?: string
  doctorId?: number
  status?: number
  beginTime?: string
  endTime?: string
}

export interface OrderPage {
  record: Order[]
  total: number
  pageNum: number
  pageSize: number
}

const orderContentSchema: z.ZodType<OrderContentInput> = z.object({
  title: z
    .string()
    .nullable()
    .optional()
    .transform((value) => value ?? undefined),
  name: z
    .string()
    .nullable()
    .optional()
    .transform((value) => value ?? undefined),
  content: z
    .string()
    .nullable()
    .optional()
    .transform((value) => value ?? undefined),
})

const orderSchema = z
  .object({
    orderId: z.number().nullable().optional(),
    orderNum: z.string().nullable().optional(),
    packageName: z.string().nullable().optional(),
    price: z.number().nullable().optional(),
    originalPrice: z.number().nullable().optional(),
    disease: z.string().nullable().optional(),
    userAnswerId: z.preprocess((value) => {
      if (value === null || typeof value === "undefined") return value
      if (typeof value === "string") return value
      if (typeof value === "number" && !Number.isNaN(value))
        return String(value)
      return value
    }, z.string().nullable().optional()),
    userId: z.number().nullable().optional(),
    userName: z.string().nullable().optional(),
    status: z.number().nullable().optional(),
    contents: z.array(orderContentSchema).default([]),
    createTime: z.string().nullable().optional(),
    updateTime: z.string().nullable().optional(),
  })
  .passthrough()

export type Order = z.infer<typeof orderSchema>

const orderPageSchema = z.object({
  record: z.array(orderSchema).default([]),
  total: z.number().default(0),
  pageNum: z.number().default(1),
  pageSize: z.number().default(20),
})

export const createOrder = async (payload: OrderCreateInput) => {
  const data = await request<Order, OrderCreateInput>(
    "/backend/order/create",
    "POST",
    payload
  )
  return orderSchema.parse(data)
}

export const getAppOrderDetail = async (query: OrderDetailQuery) => {
  const data = await request<Order, OrderDetailQuery>(
    "/app/order/detail",
    "GET",
    query
  )
  return orderSchema.parse(data)
}

export const listBackendOrders = async (
  query: OrderListQuery
): Promise<OrderPage> => {
  const data = await request<OrderPage, OrderListQuery>(
    "/backend/order/list",
    "GET",
    query
  )
  return orderPageSchema.parse(data)
}

export const getBackendOrderDetail = async (orderId: number) => {
  const data = await request<Order, { orderId: number }>(
    "/backend/order/detail",
    "GET",
    { orderId }
  )
  return orderSchema.parse(data)
}

export const cancelBackendOrder = async (orderId: number) => {
  const data = await request<boolean, Record<string, never>>(
    `/backend/order/cancel/${orderId}`,
    "POST"
  )
  return z.boolean().parse(data)
}

export const deleteBackendOrder = async (orderId: number) => {
  const data = await request<boolean, Record<string, never>>(
    `/backend/order/delete/${orderId}`,
    "POST"
  )
  return z.boolean().parse(data)
}

export const cancelAppOrder = async (orderId: number) => {
  const data = await request<boolean, Record<string, never>>(
    `/app/order/cancel/${orderId}`,
    "POST"
  )
  return z.boolean().parse(data)
}

export const getAppPayChannels = async () => {
  return await request<unknown, Record<string, never>>(
    "/app/order/getPayChannel",
    "GET"
  )
}

const paySubmitSchema = z
  .object({
    orderId: z.number(),
    channel: z.string(),
  })
  .passthrough()

export type AppPaySubmitPayload = z.infer<typeof paySubmitSchema>

export const submitAppPay = async (payload: AppPaySubmitPayload) => {
  const parsed = paySubmitSchema.parse(payload)
  return await request<unknown, AppPaySubmitPayload>(
    "/app/order/pay/submit",
    "POST",
    parsed
  )
}
