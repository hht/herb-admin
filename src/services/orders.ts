import { z } from "zod"

import { request } from "~/hooks/useRequest"

export interface OrderContentInput {
  title?: string
  name?: string
  content?: string
}

export interface Order {
  orderId?: number | null
  orderNum?: string | null
  packageName?: string | null
  price?: number | null
  originalPrice?: number | null
  disease?: string | null
  userAnswerId?: string | null
  userId?: number | null
  userName?: string | null
  status?: number | null
  contents?: OrderContentInput[]
  createTime?: string | null
  updateTime?: string | null
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

const orderContentSchema: z.ZodType<OrderContentInput> = z.object({
  title: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
})

const orderSchema: z.ZodType<Order> = z.object({
  orderId: z.number().nullable().optional(),
  orderNum: z.string().nullable().optional(),
  packageName: z.string().nullable().optional(),
  price: z.number().nullable().optional(),
  originalPrice: z.number().nullable().optional(),
  disease: z.string().nullable().optional(),
  userAnswerId: z.preprocess(
    (value) => {
      if (value === null || typeof value === "undefined") return value
      if (typeof value === "string") return value
      if (typeof value === "number" && !Number.isNaN(value)) return String(value)
      return value
    },
    z.string().nullable().optional()
  ),
  userId: z.number().nullable().optional(),
  userName: z.string().nullable().optional(),
  status: z.number().nullable().optional(),
  contents: z.array(orderContentSchema).default([]),
  createTime: z.string().nullable().optional(),
  updateTime: z.string().nullable().optional(),
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
