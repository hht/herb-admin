import { z } from "zod"

import { request } from "~/hooks/useRequest"

const employeeSchema = z.object({
  userId: z.number().nullable().optional(),
  areaCode: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  nickName: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  role: z.union([z.string(), z.number()]).nullable().optional(),
  sex: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  phonenumber: z.string().nullable().optional(),
  post: z.string().nullable().optional(),
  introduction: z.string().nullable().optional(),
  licenseNo: z.string().nullable().optional(),
  remark: z.string().nullable().optional(),
  createTime: z.string().nullable().optional(),
  updateTime: z.string().nullable().optional(),
})

const pageSchema = z.object({
  record: z.array(employeeSchema).default([]),
  total: z.number().default(0),
  pageNum: z.number().default(1),
  pageSize: z.number().default(20),
})

export type Employee = z.infer<typeof employeeSchema>
export type EmployeePage = z.infer<typeof pageSchema>

export interface EmployeeQuery {
  nickName?: string
  username?: string
  role?: string
  pageNum?: number
  pageSize?: number
}

export interface EmployeeInput {
  userId?: number
  areaCode: string
  username: string
  password?: string
  nickName?: string
  email?: string
  introduction?: string
  licenseNo?: string
  post?: string
  role?: number
  sex?: string
  status?: string
  phonenumber?: string
  remark?: string
}

export type EmployeeCreateInput = EmployeeInput & { password: string }

export const listEmployees = async (
  params: EmployeeQuery
): Promise<EmployeePage> => {
  const data = await request<EmployeePage, EmployeeQuery>(
    "/backend/user/list",
    "GET",
    params
  )
  return pageSchema.parse(data)
}

export const createEmployee = async (payload: EmployeeCreateInput) =>
  await request<Employee, EmployeeCreateInput>(
    "/backend/user/create",
    "POST",
    payload
  )

export const updateEmployee = async (payload: EmployeeInput) =>
  await request<Employee, EmployeeInput>("/backend/user/edit", "POST", payload)

export const deleteEmployee = async (userId: number) =>
  await request("/backend/user/edit", "POST", {
    userId,
    status: "0",
  })

export const getEmployeeDetail = async (userId: number) =>
  await request<Employee, Record<string, never>>(
    `/backend/user/detail/${userId}`,
    "GET"
  )
