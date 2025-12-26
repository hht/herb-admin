import { createFileRoute } from "@tanstack/react-router"
import dayjs from "dayjs"
import { useMemo } from "react"
import { MoreIcon, SearchIcon } from "tdesign-icons-react"
import {
  Button,
  Dialog,
  DialogPlugin,
  Drawer,
  Dropdown,
  Form,
  Input,
  Loading,
  MessagePlugin,
  Pagination,
  Radio,
  Space,
  Table,
  Tag,
  Tabs,
} from "tdesign-react"
import { shallow } from "zustand/shallow"

import { buildTableColumns, type TableFieldSchema } from "~/components"
import { useRequest } from "~/hooks/useRequest"
import { useHerbStore } from "~/hooks/useStore"
import {
  createEmployee,
  deleteEmployee,
  getEmployeeDetail,
  listEmployees,
  updateEmployee,
  type Employee,
  type EmployeeInput,
} from "~/services/employees"
import { useEmployeeStore } from "~/stores/employee-store"

const TAB_OPTIONS = [
  { label: "全部员工", value: "all", role: undefined },
  { label: "健康顾问", value: "advisor", role: 4 },
  { label: "专业医生", value: "doctor", role: 3 },
  { label: "管理员", value: "admin", role: 1 },
]

const TAB_LIST = TAB_OPTIONS.map((item) => ({
  label: item.label,
  value: item.value,
}))

const ROLE_OPTIONS = [
  { label: "健康顾问", value: 4 },
  { label: "专业医生", value: 3 },
  { label: "管理员", value: 1 },
  { label: "职员", value: 2 },
]

const PERMISSION_OPTIONS = [
  { label: "健康顾问", value: 4 },
  { label: "专业医生", value: 3 },
  { label: "管理员", value: 1 },
]

const SEX_OPTIONS = [
  { label: "男", value: "1" },
  { label: "女", value: "2" },
]

function formatTime(value?: string | null) {
  if (!value) return "-"
  const date = dayjs(value)
  return date.isValid() ? date.format("YYYY/MM/DD HH:mm") : "-"
}

function toNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

function getRoleLabel(value?: Employee["role"] | null) {
  const parsed = toNumber(value)
  const option = ROLE_OPTIONS.find((item) => item.value === parsed)
  return option?.label ?? "-"
}

function getSexLabel(value?: string | null) {
  const option = SEX_OPTIONS.find((item) => item.value === value)
  return option?.label ?? "-"
}

function getStatusLabel(status?: string | null) {
  if (status === "1") return { label: "在线", theme: "success" as const }
  if (status === "0") return { label: "离线", theme: "default" as const }
  return { label: "-", theme: "default" as const }
}

function buildFormValues(employee?: Employee | null) {
  return {
    userId: employee?.userId ? String(employee.userId) : "",
    nickName: employee?.nickName ?? "",
    sex: employee?.sex ?? "",
    post: employee?.post ?? "",
    phonenumber: employee?.phonenumber ?? employee?.username ?? "",
    email: employee?.email ?? "",
    role: toNumber(employee?.role),
    password: "",
  }
}

function getTabRole(value: string) {
  return TAB_OPTIONS.find((item) => item.value === value)?.role
}

const TABLE_SCHEMA: TableFieldSchema<Employee>[] = [
  { colKey: "userId", title: "员工编号", width: 120 },
  { colKey: "nickName", title: "员工姓名", width: 160, ellipsis: true },
  {
    colKey: "role",
    title: "员工权限",
    width: 140,
    render: (row) => getRoleLabel(row.role),
  },
  {
    colKey: "status",
    title: "员工状态",
    width: 120,
    render: (row) => {
      const status = getStatusLabel(row.status)
      return status.label === "-" ? (
        "-"
      ) : (
        <Tag theme={status.theme} variant="light">
          {status.label}
        </Tag>
      )
    },
  },
  {
    colKey: "updateTime",
    title: "最后登录时间",
    width: 200,
    render: (row) => formatTime(row.updateTime ?? row.createTime),
  },
]

const EmployeeManagement = () => {
  const currentRole = useHerbStore((state) => state.role)
  const {
    query,
    activeTab,
    keyword,
    drawerVisible,
    detailVisible,
    editing,
    detail,
    permissionVisible,
    permissionTarget,
    permissionRole,
    setState,
    setQuery,
  } = useEmployeeStore(
    (state) => ({
      query: state.query,
      activeTab: state.activeTab,
      keyword: state.keyword,
      drawerVisible: state.drawerVisible,
      detailVisible: state.detailVisible,
      editing: state.editing,
      detail: state.detail,
      permissionVisible: state.permissionVisible,
      permissionTarget: state.permissionTarget,
      permissionRole: state.permissionRole,
      setState: state.setState,
      setQuery: state.setQuery,
    }),
    shallow
  )
  const [form] = Form.useForm()

  const { data, loading, runAsync } = useRequest(() => listEmployees(query), {
    refreshDeps: [JSON.stringify(query)],
  })
  const { runAsync: runDetail, loading: detailLoading } = useRequest(
    (userId: number) => getEmployeeDetail(userId),
    {
      manual: true,
    }
  )
  const { runAsync: runCreate, loading: createLoading } = useRequest(
    createEmployee,
    { manual: true }
  )
  const { runAsync: runUpdate, loading: updateLoading } = useRequest(
    updateEmployee,
    { manual: true }
  )
  const { runAsync: runDelete } = useRequest(deleteEmployee, { manual: true })

  const records = useMemo(() => data?.record ?? [], [data])
  const canEdit = toNumber(currentRole) === 1

  const handleSearch = () => {
    setQuery({
      pageNum: 1,
      nickName: keyword.trim() || undefined,
    })
  }

  const handleTabChange = (value: string | number) => {
    const nextTab = String(value)
    const role = getTabRole(nextTab)
    setState({ activeTab: nextTab })
    setQuery({
      pageNum: 1,
      role: role ? String(role) : undefined,
    })
  }

  const openFormDrawer = async (employee?: Employee) => {
    setState({ drawerVisible: true })
    if (!employee) {
      setState({ editing: null })
      form.reset()
      form.setFieldsValue({ role: undefined })
      return
    }
    setState({ editing: employee })
    form.setFieldsValue(buildFormValues(employee))
    if (!employee.userId) return
    const detailData = await runDetail(employee.userId)
    setState({ editing: detailData })
    form.setFieldsValue(buildFormValues(detailData))
  }

  const closeFormDrawer = () => {
    setState({ drawerVisible: false, editing: null })
    form.reset()
  }

  const openDetailDrawer = async (employee: Employee) => {
    setState({ detailVisible: true, detail: employee })
    if (!employee.userId) return
    const detailData = await runDetail(employee.userId)
    setState({ detail: detailData })
  }

  const closeDetailDrawer = () => {
    setState({ detailVisible: false, detail: null })
  }

  const handleContact = (employee: Employee) => {
    const phone = employee.phonenumber ?? employee.username ?? ""
    const email = employee.email ?? ""
    if (!phone && !email) {
      MessagePlugin.info("暂无联系方式")
      return
    }
    const contact = [phone, email].filter(Boolean).join(" / ")
    MessagePlugin.info(`联系方式：${contact}`)
  }

  const openPermissionDialog = async (employee: Employee) => {
    setState({
      permissionVisible: true,
      permissionTarget: employee,
      permissionRole: toNumber(employee.role),
    })
    if (!employee.userId || (employee.username && employee.areaCode)) return
    const detailData = await runDetail(employee.userId)
    setState({
      permissionTarget: detailData,
      permissionRole: toNumber(detailData.role),
    })
  }

  const closePermissionDialog = () => {
    setState({
      permissionVisible: false,
      permissionTarget: null,
      permissionRole: undefined,
    })
  }

  const handlePermissionSubmit = async () => {
    if (!permissionTarget?.userId) {
      MessagePlugin.error("缺少员工编号")
      return
    }
    if (!permissionRole) {
      MessagePlugin.warning("请选择员工权限")
      return
    }
    const username = permissionTarget.username ?? permissionTarget.phonenumber
    if (!username) {
      MessagePlugin.error("缺少账号信息")
      return
    }
    await runUpdate({
      userId: permissionTarget.userId,
      areaCode: permissionTarget.areaCode ?? "86",
      username,
      phonenumber: permissionTarget.phonenumber ?? username,
      role: permissionRole,
      status: permissionTarget.status ?? "1",
    })
    MessagePlugin.success("权限已更新")
    closePermissionDialog()
    runAsync()
  }

  const handleDelete = (employee: Employee) => {
    if (!employee.userId) {
      MessagePlugin.error("缺少员工编号")
      return
    }
    const dialog = DialogPlugin.confirm({
      header: "确认删除",
      body: `确定删除员工${employee.nickName ?? ""}吗？`,
      confirmBtn: "删除",
      cancelBtn: "取消",
      onConfirm: async () => {
        dialog.setConfirmLoading(true)
        try {
          await runDelete(employee.userId)
          MessagePlugin.success("已删除")
          dialog.hide()
          runAsync()
        } finally {
          dialog.setConfirmLoading(false)
        }
      },
      onClose: () => dialog.hide(),
    })
  }

  const handleSubmit = async () => {
    const valid = await form.validate()
    if (valid !== true) return
    const values = form.getFieldsValue(true) as Record<string, unknown>
    const phone = String(values.phonenumber ?? "")
    const payload: EmployeeInput = {
      userId: editing?.userId ?? undefined,
      areaCode: editing?.areaCode ?? "86",
      username: phone,
      password: values.password ? String(values.password) : undefined,
      nickName: values.nickName ? String(values.nickName) : undefined,
      email: values.email ? String(values.email) : undefined,
      post: values.post ? String(values.post) : undefined,
      role: toNumber(values.role),
      sex: values.sex ? String(values.sex) : undefined,
      status: editing?.status ?? "1",
      phonenumber: phone,
    }

    if (editing) {
      if (!values.password) {
        delete payload.password
      }
      await runUpdate(payload)
      MessagePlugin.success("更新成功")
    } else {
      const createPayload = {
        ...payload,
        password: String(values.password ?? ""),
      } as EmployeeInput & { password: string }
      await runCreate(createPayload)
      MessagePlugin.success("创建成功")
    }
    closeFormDrawer()
    runAsync()
  }

  const handleChangePage = (pageInfo: {
    current: number
    pageSize: number
  }) => {
    setQuery({
      pageNum: pageInfo.current,
      pageSize: pageInfo.pageSize,
    })
  }

  const columns = buildTableColumns<Employee>([
    {
      colKey: "userId",
      title: "员工编号",
      width: 120,
      render: (row) => row.userId ?? "-",
    },
    {
      colKey: "nickName",
      title: "员工姓名",
      width: 160,
      ellipsis: true,
      render: (row) => (
        <Button
          theme="primary"
          variant="text"
          className="px-0"
          onClick={() => openDetailDrawer(row)}
        >
          {row.nickName ?? row.username ?? "-"}
        </Button>
      ),
    },
    ...TABLE_SCHEMA,
    {
      colKey: "actions",
      title: "操作",
      width: 260,
      fixed: "right",
      render: (row) =>
        canEdit ? (
          <Space size="small">
            <Button
              theme="primary"
              variant="text"
              onClick={() => handleContact(row)}
            >
              联系
            </Button>
            <Button
              theme="primary"
              variant="text"
              onClick={() => openPermissionDialog(row)}
            >
              编辑权限
            </Button>
            <Dropdown
              trigger="click"
              placement="bottom-right"
              options={[
                { content: "管理", value: "manage" },
                { content: "删除", value: "delete", theme: "error" },
              ]}
              onClick={(option) => {
                if (option.value === "manage") {
                  openFormDrawer(row)
                  return
                }
                if (option.value === "delete") {
                  handleDelete(row)
                }
              }}
            >
              <Button variant="text" className="px-2">
                <MoreIcon size={16} />
              </Button>
            </Dropdown>
          </Space>
        ) : (
          <Space size="small">
            <Button
              theme="primary"
              variant="text"
              onClick={() => handleContact(row)}
            >
              联系
            </Button>
            <Button
              theme="primary"
              variant="text"
              onClick={() => openDetailDrawer(row)}
            >
              查看详情
            </Button>
          </Space>
        ),
    },
  ])

  const detailItems = [
    { label: "员工姓名", value: detail?.nickName ?? "-" },
    { label: "员工编号", value: detail?.userId ? String(detail.userId) : "-" },
    { label: "性别", value: getSexLabel(detail?.sex) },
    {
      label: "手机",
      value: detail?.phonenumber ?? detail?.username ?? "-",
    },
    { label: "办公邮箱", value: detail?.email ?? "-" },
    { label: "职位", value: detail?.post ?? "-" },
    { label: "员工权限", value: getRoleLabel(detail?.role), span: 3 },
  ]

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex-1 overflow-auto bg-neutral-50 p-8">
        <div className="rounded-xl border border-border bg-white p-6">
          <div className="flex flex-wrap items-center gap-4">
            <Tabs
              theme="normal"
              value={activeTab}
              list={TAB_LIST}
              onChange={handleTabChange}
            />
          </div>
          {canEdit ? (
            <div className="flex flex-wrap py-4 items-center justify-between gap-4">
              <Button theme="primary" onClick={() => openFormDrawer()}>
                新增员工
              </Button>
              <div className="w-[240px]">
                <Input
                  value={keyword}
                  onChange={(value) => setState({ keyword: value })}
                  onEnter={handleSearch}
                  placeholder="请输入员工姓名"
                  suffixIcon={<SearchIcon size={16} />}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap py-4 items-center gap-4">
              <div className="w-[240px]">
                <Input
                  value={keyword}
                  onChange={(value) => setState({ keyword: value })}
                  onEnter={handleSearch}
                  placeholder="请输入员工姓名"
                  suffixIcon={<SearchIcon size={16} />}
                />
              </div>
            </div>
          )}

          <div className="my-6 border-t border-border" />

          <div className="overflow-x-auto">
            <Table
              columns={columns}
              tableLayout="fixed"
              className="w-full min-w-full"
              data={records}
              rowKey="userId"
              loading={loading}
              empty="暂无员工数据"
              cellEmptyContent="-"
            />
          </div>

          <div className="mt-6 flex justify-end">
            <Pagination
              current={query.pageNum ?? 1}
              pageSize={query.pageSize ?? 20}
              total={data?.total ?? 0}
              onChange={handleChangePage}
            />
          </div>
        </div>
      </div>

      <Drawer
        className="employee-drawer"
        header={editing ? "员工管理" : "新增员工"}
        visible={drawerVisible}
        placement="right"
        size="760px"
        onClose={closeFormDrawer}
        footer={
          <div className="flex items-center gap-2">
            <Button
              theme="primary"
              onClick={handleSubmit}
              disabled={createLoading || updateLoading}
            >
              保存
            </Button>
            <Button variant="outline" onClick={closeFormDrawer}>
              取消
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" colon={false}>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="text-sm font-medium text-neutral-900">
                员工基础信息
              </div>
              <div className="grid grid-cols-2 gap-6">
                <Form.FormItem
                  name="nickName"
                  label="员工姓名"
                  rules={[{ required: true, message: "请输入员工姓名" }]}
                >
                  <Input placeholder="请输入员工姓名" />
                </Form.FormItem>
                <Form.FormItem name="userId" label="员工编号">
                  <Input disabled />
                </Form.FormItem>
                <Form.FormItem name="sex" label="性别">
                  <Radio.Group options={SEX_OPTIONS} />
                </Form.FormItem>
                <Form.FormItem name="post" label="职位">
                  <Input placeholder="请输入职位" />
                </Form.FormItem>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-sm font-medium text-neutral-900">
                账户信息
              </div>
              <div className="grid grid-cols-2 gap-6">
                <Form.FormItem
                  name="phonenumber"
                  label="手机号"
                  rules={[{ required: true, message: "请输入手机号" }]}
                >
                  <Input placeholder="请输入手机号" />
                </Form.FormItem>
                <Form.FormItem name="email" label="办公邮箱">
                  <Input placeholder="请输入办公邮箱" />
                </Form.FormItem>
                <Form.FormItem
                  name="password"
                  label="初始密码"
                  className="col-span-2"
                  rules={
                    editing
                      ? []
                      : [{ required: true, message: "请输入初始密码" }]
                  }
                >
                  <Input type="password" placeholder="请输入初始密码" />
                </Form.FormItem>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-sm font-medium text-neutral-900">
                员工权限
              </div>
              <Form.FormItem
                name="role"
                rules={[{ required: true, message: "请选择员工权限" }]}
              >
                <Radio.Group options={PERMISSION_OPTIONS} />
              </Form.FormItem>
            </div>
          </div>
        </Form>
      </Drawer>

      <Drawer
        className="employee-drawer"
        header="查看详情"
        visible={detailVisible}
        placement="right"
        size="640px"
        onClose={closeDetailDrawer}
        footer={
          <div className="flex justify-start">
            <Button theme="primary" onClick={closeDetailDrawer}>
              返回
            </Button>
          </div>
        }
      >
        <Loading loading={detailLoading}>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded bg-brand text-white">
                  <span className="text-xs">员</span>
                </div>
                <span className="text-sm font-medium text-neutral-900">
                  员工信息
                </span>
              </div>
              <Button variant="text" className="px-2">
                <MoreIcon size={16} />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-x-12 gap-y-6">
              {detailItems.map((item) => (
                <div
                  key={item.label}
                  className={`space-y-1 ${item.span ? "col-span-3" : ""}`}
                >
                  <div className="text-xs text-neutral-500">{item.label}</div>
                  <div className="text-sm text-neutral-900">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </Loading>
      </Drawer>

      <Dialog
        header="编辑权限"
        visible={permissionVisible}
        closeOnOverlayClick={false}
        onClose={closePermissionDialog}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={closePermissionDialog}>
              取消
            </Button>
            <Button
              theme="primary"
              onClick={handlePermissionSubmit}
              disabled={updateLoading}
            >
              保存
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="text-sm text-neutral-600">
            当前员工：
            {permissionTarget?.nickName ?? permissionTarget?.username ?? "-"}
          </div>
          <Radio.Group
            options={PERMISSION_OPTIONS}
            value={permissionRole}
            onChange={(value) => setState({ permissionRole: Number(value) })}
          />
        </div>
      </Dialog>
    </div>
  )
}

export const Route = createFileRoute("/_herb/employees")({
  component: EmployeeManagement,
})
