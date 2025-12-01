import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  Button,
  Card,
  Drawer,
  Form,
  MessagePlugin,
  Popconfirm,
  Space,
  Table,
  Tag,
} from "tdesign-react"

import {
  SchemaForm,
  buildTableColumns,
  type FieldSchema,
  type TableFieldSchema,
} from "~/components"
import { useRequest } from "~/hooks/useRequest"
import {
  createEmployee,
  deleteEmployee,
  listEmployees,
  updateEmployee,
  getEmployeeDetail,
  type Employee,
  type EmployeeInput,
  type EmployeeQuery,
} from "~/services/employees"

const AREA_CODE_OPTIONS = [
  { label: "+86", value: "86" },
  { label: "+852", value: "852" },
]

const ROLE_OPTIONS = [
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

export const Route = createFileRoute("/_herb/employees")({
  component: EmployeePage,
})

function EmployeePage() {
  const [query, setQuery] = useState<EmployeeQuery>(DEFAULT_QUERY)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [form] = Form.useForm()
  const [searchForm] = Form.useForm()

  const { data, loading, runAsync } = useRequest(() => listEmployees(query), {
    refreshDeps: [JSON.stringify(query)],
  })

  const { runAsync: fetchEmployeeDetail, loading: detailLoading } = useRequest(
    async (userId: number) => await getEmployeeDetail(userId),
    { manual: true }
  )

  const fillForm = (employee: Employee) => {
    form.setFieldsValue({
      userId: employee.userId,
      areaCode: employee.areaCode ?? "86",
      username: employee.username ?? "",
      nickName: employee.nickName ?? "",
      role: employee.role ? Number(employee.role) : undefined,
      sex: employee.sex ?? undefined,
      email: employee.email ?? "",
      phonenumber: employee.phonenumber ?? "",
      post: employee.post ?? "",
      licenseNo: employee.licenseNo ?? "",
      introduction: employee.introduction ?? "",
      status: employee.status ?? "1",
      remark: employee.remark ?? "",
      password: undefined,
    })
  }

  const onSearch = () => {
    const values = searchForm.getFieldsValue(true) as EmployeeQuery
    setQuery((prev) => ({
      ...prev,
      pageNum: 1,
      ...values,
      role: values.role ? String(values.role) : undefined,
    }))
  }

  const onReset = () => {
    searchForm.reset()
    setQuery(DEFAULT_QUERY)
  }

  const openDrawer = (record?: Employee) => {
    setEditing(record ?? null)
    setDrawerVisible(true)
    if (record) {
      fillForm(record)
      if (record.userId) {
        fetchEmployeeDetail(record.userId)
          .then((detail) => {
            setEditing(detail)
            fillForm(detail)
          })
          .catch(() => undefined)
      }
    } else {
      form.reset()
      form.setFieldsValue({ areaCode: "86", role: 2, status: "1" })
    }
  }

  const { run: handleSubmit } = useRequest(
    async () => {
      const validationResult = await form.validate()
      if (validationResult !== true) {
        return
      }
      const values = form.getFieldsValue(true) as EmployeeInput
      const payload: EmployeeInput = {
        userId: editing?.userId ?? undefined,
        areaCode: values.areaCode ?? "86",
        username: values.username,
        password: values.password,
        nickName: values.nickName,
        email: values.email,
        introduction: values.introduction,
        licenseNo: values.licenseNo,
        post: values.post,
        role: values.role ? Number(values.role) : undefined,
        sex: values.sex,
        status: values.status ?? "1",
        phonenumber: values.phonenumber,
        remark: values.remark,
      }
      if (editing) {
        if (!values.password) {
          delete (payload as unknown as EmployeeInput).password
        }
        await updateEmployee(payload)
        MessagePlugin.success("员工信息已更新")
      } else {
        await createEmployee({ ...payload, password: values.password! })
        MessagePlugin.success("员工已创建")
      }
      setDrawerVisible(false)
      runAsync()
    },
    {
      manual: true,
    }
  )

  const handleDelete = async (employee: Employee) => {
    if (!employee.userId) return
    try {
      await deleteEmployee(employee.userId)
      MessagePlugin.success("已删除")
      runAsync()
    } catch (error) {
      MessagePlugin.error((error as Error)?.message ?? "删除失败")
    }
  }

  const columns = buildTableColumns<Employee>([
    ...tableSchema,
    {
      colKey: "actions",
      title: "操作",
      width: 160,
      fixed: "right",
      render: (row) => (
        <Space size="small">
          <Button
            theme="primary"
            variant="text"
            onClick={() => openDrawer(row)}
          >
            信息管理
          </Button>
          <Popconfirm
            content="确定删除该员工吗？"
            onConfirm={() => handleDelete(row)}
          >
            <Button theme="danger" variant="text">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ])

  const drawerSchema = editing
    ? formSchema
    : formSchema.map((field) =>
        field.name === "password" ? { ...field, required: true } : field
      )

  return (
    <div className="space-y-4 min-w-0">
      <Card bordered={false} className="rounded-xl min-w-0">
        <SchemaForm
          form={searchForm}
          schema={searchSchema}
          layout="inline"
          colon={false}
          className="gap-4"
          actions={
            <Space size="small">
              <Button theme="primary" onClick={onSearch}>
                查询
              </Button>
              <Button onClick={onReset}>重置</Button>
              <Button
                theme="primary"
                variant="outline"
                onClick={() => openDrawer()}
              >
                新增员工
              </Button>
            </Space>
          }
          actionsAlign="end"
        />
      </Card>

      <Card bordered={false} className="rounded-xl w-full min-w-0">
        <div className="overflow-x-auto min-w-0 max-w-full">
          <Table
            columns={columns}
            tableLayout="fixed"
            className="w-full min-w-full"
            data={data?.record ?? []}
            rowKey="userId"
            loading={loading}
            pagination={{
              current: query.pageNum,
              pageSize: query.pageSize,
              total: data?.total ?? 0,
              onChange: (pageInfo) =>
                setQuery((prev) => ({
                  ...prev,
                  pageNum: pageInfo.current,
                  pageSize: pageInfo.pageSize,
                })),
            }}
          />
        </div>
      </Card>

      <Drawer
        header={editing ? "信息管理" : "新增员工"}
        visible={drawerVisible}
        placement="right"
        size="40%"
        onClose={() => setDrawerVisible(false)}
        footer={
          <Space>
            <Button onClick={() => setDrawerVisible(false)}>取消</Button>
            <Button
              theme="primary"
              onClick={handleSubmit}
              disabled={detailLoading}
            >
              保存
            </Button>
          </Space>
        }
      >
        <SchemaForm form={form} schema={drawerSchema} layout="vertical" />
      </Drawer>
    </div>
  )
}
