import { createFileRoute } from "@tanstack/react-router"
import { Button, Popconfirm, Space, Tag } from "tdesign-react"

import {
  SchemaCrud,
  type FieldSchema,
  type TableFieldSchema,
} from "~/components"
import {
  createEmployee,
  deleteEmployee,
  getEmployeeDetail,
  listEmployees,
  updateEmployee,
  type Employee,
  type EmployeeInput,
  type EmployeeQuery,
} from "~/services/employees"

const AREA_CODE_OPTIONS = [
  { label: "+86", value: "86" },
  { label: "+852", value: "852" },
]

const ROLE_OPTIONS = [
  { label: "管理员", value: 1 },
  { label: "职员", value: 2 },
  { label: "医生", value: 3 },
  { label: "顾问", value: 4 },
]

const STATUS_OPTIONS = [
  { label: "启用", value: "1" },
  { label: "禁用", value: "0" },
]

const SEX_OPTIONS = [
  { label: "男", value: "1" },
  { label: "女", value: "2" },
]

const searchSchema: FieldSchema[] = [
  {
    name: "nickName",
    label: "员工名称",
    placeholder: "请输入员工名称",
    props: { style: { width: 200 } },
  },
  {
    name: "username",
    label: "手机号",
    placeholder: "请输入手机号",
    props: { style: { width: 200 } },
  },
  {
    name: "role",
    label: "类型",
    component: "select",
    options: ROLE_OPTIONS,
    props: { style: { width: 200 } },
  },
]

const formSchema: FieldSchema[] = [
  {
    name: "areaCode",
    label: "区号",
    component: "select",
    required: true,
    options: AREA_CODE_OPTIONS,
  },
  { name: "username", label: "账号/手机号", required: true },
  {
    name: "password",
    label: "登录密码",
    component: "password",
    props: { placeholder: "新增必填，编辑时留空表示不修改" },
  },
  { name: "nickName", label: "员工姓名" },
  {
    name: "role",
    label: "职位类型",
    component: "select",
    options: ROLE_OPTIONS,
  },
  {
    name: "sex",
    label: "性别",
    component: "select",
    options: SEX_OPTIONS,
  },
  { name: "email", label: "邮箱" },
  { name: "phonenumber", label: "联系电话" },
  { name: "post", label: "岗位" },
  { name: "licenseNo", label: "证书编号" },
  {
    name: "introduction",
    label: "简介",
    component: "textarea",
    props: { rows: 3 },
  },
  {
    name: "status",
    label: "状态",
    component: "select",
    required: true,
    options: STATUS_OPTIONS,
  },
  { name: "remark", label: "备注", component: "textarea", props: { rows: 3 } },
]

const tableSchema: TableFieldSchema<Employee>[] = [
  { colKey: "nickName", title: "员工姓名", width: 150, ellipsis: true },
  { colKey: "username", title: "账号", width: 160 },
  { colKey: "areaCode", title: "区号", width: 100 },
  { colKey: "phonenumber", title: "联系电话", width: 180 },
  {
    colKey: "role",
    title: "职位类型",
    width: 140,
    render: (row) => {
      const option = ROLE_OPTIONS.find(
        (item) => String(item.value) === String(row.role ?? "")
      )
      return option?.label ?? "-"
    },
  },
  {
    colKey: "sex",
    title: "性别",
    width: 100,
    render: (row) => {
      const option = SEX_OPTIONS.find((item) => item.value === row.sex)
      return option?.label ?? "-"
    },
  },
  { colKey: "email", title: "邮箱", width: 220, ellipsis: true },
  { colKey: "post", title: "岗位", width: 140, ellipsis: true },
  { colKey: "licenseNo", title: "证书编号", width: 200, ellipsis: true },
  { colKey: "introduction", title: "简介", width: 260, ellipsis: true },
  {
    colKey: "status",
    title: "状态",
    width: 120,
    render: (row) =>
      row.status === "1" ? (
        <Tag theme="success" variant="light">
          启用
        </Tag>
      ) : (
        <Tag theme="default" variant="light">
          禁用
        </Tag>
      ),
  },
  { colKey: "createTime", title: "创建日期", width: 180 },
]

const DEFAULT_QUERY: EmployeeQuery = { pageNum: 1, pageSize: 20 }

const buildFormValues = (employee?: Employee | null) => ({
  userId: employee?.userId,
  areaCode: employee?.areaCode ?? "86",
  username: employee?.username ?? "",
  nickName: employee?.nickName ?? "",
  role: employee?.role ? Number(employee.role) : undefined,
  sex: employee?.sex ?? undefined,
  email: employee?.email ?? "",
  phonenumber: employee?.phonenumber ?? "",
  post: employee?.post ?? "",
  licenseNo: employee?.licenseNo ?? "",
  introduction: employee?.introduction ?? "",
  status: employee?.status ?? "1",
  remark: employee?.remark ?? "",
  password: undefined,
})

export const Route = createFileRoute("/_herb/employees")({
  component: () => (
    <SchemaCrud<Employee, EmployeeQuery, EmployeeInput>
      searchSchema={searchSchema}
      tableSchema={tableSchema}
      formSchema={formSchema}
      defaultQuery={DEFAULT_QUERY}
      rowKey="userId"
      list={listEmployees}
      create={async (payload) => {
        await createEmployee(payload as EmployeeInput & { password: string })
      }}
      update={updateEmployee}
      remove={async (employee) => {
        if (!employee.userId) return
        await deleteEmployee(employee.userId)
      }}
      detail={async (employee) => {
        if (!employee.userId) return employee
        return await getEmployeeDetail(employee.userId)
      }}
      formatSearchValues={(values) => ({
        nickName: values.nickName as string,
        username: values.username as string,
        role: values.role ? String(values.role) : undefined,
      })}
      formatFormValues={(record) => buildFormValues(record)}
      mapSubmitValues={(values, editing) => {
        const payload: EmployeeInput = {
          userId: editing?.userId ?? undefined,
          areaCode: (values.areaCode as string) ?? "86",
          username: values.username as string,
          password: values.password as string | undefined,
          nickName: values.nickName as string | undefined,
          email: values.email as string | undefined,
          introduction: values.introduction as string | undefined,
          licenseNo: values.licenseNo as string | undefined,
          post: values.post as string | undefined,
          role: values.role ? Number(values.role) : undefined,
          sex: values.sex as string | undefined,
          status: (values.status as string) ?? "1",
          phonenumber: values.phonenumber as string | undefined,
          remark: values.remark as string | undefined,
        }
        if (editing) {
          if (!values.password) {
            delete payload.password
          }
          return payload
        }
        return { ...payload, password: (values.password as string) ?? "123456" }
      }}
      getCreateInitialValues={() => ({ areaCode: "86", role: 2, status: "1" })}
      getFormSchema={(editing, schema) =>
        editing
          ? schema
          : schema.map((field) =>
              field.name === "password" ? { ...field, required: true } : field
            )
      }
      drawerTitle={{ create: "新增员工", edit: "信息管理" }}
      renderActions={(row, { openDrawer, remove }) => (
        <Space size="small">
          <Button
            theme="primary"
            variant="text"
            onClick={() => openDrawer(row)}
          >
            信息管理
          </Button>
          {remove ? (
            <Popconfirm
              content="确定删除该员工吗？"
              onConfirm={() => remove(row)}
            >
              <Button theme="danger" variant="text">
                删除
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      )}
    />
  ),
})
