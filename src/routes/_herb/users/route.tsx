import { createFileRoute } from "@tanstack/react-router"
import dayjs from "dayjs"
import { useMemo, useState } from "react"
import { SearchIcon } from "tdesign-icons-react"
import {
  Button,
  Drawer,
  Form,
  Input,
  InputAdornment,
  MessagePlugin,
  Pagination,
  Popconfirm,
  Radio,
  Space,
  Switch,
  Table,
  Tag,
} from "tdesign-react"

import { buildTableColumns, type TableFieldSchema } from "~/components"
import { useRequest } from "~/hooks/useRequest"
import {
  getAppUserDetail,
  listAppUsers,
  updateAppUser,
  type AppUser,
  type AppUserInput,
  type AppUserQuery,
} from "~/services/app-users"
import { QtnRecordsDrawer } from "./qtn-records"

const DEFAULT_QUERY: AppUserQuery = { pageNum: 1, pageSize: 20, role: "5" }

const SEX_OPTIONS = [
  { label: "男", value: "1" },
  { label: "女", value: "2" },
]

const formatTime = (value?: string | null) => {
  if (!value) return "-"
  const date = dayjs(value)
  return date.isValid() ? date.format("YYYY/MM/DD HH:mm") : "-"
}

const toNumber = (value: unknown) => {
  if (value === "" || value === null || value === undefined) return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

const getUserStatus = (user: AppUser) => {
  if (user.status !== null && user.status !== undefined) {
    return user.status === "1"
      ? { label: "正常", theme: "success" as const }
      : { label: "停用", theme: "default" as const }
  }
  if (user.state !== null && user.state !== undefined) {
    if (user.state === 1) {
      return { label: "活跃", theme: "success" as const }
    }
    if (user.state === 2) {
      return { label: "未登录", theme: "warning" as const }
    }
    return { label: "禁用", theme: "default" as const }
  }
  return { label: "-", theme: "default" as const }
}

const buildFormValues = (user?: AppUser | null) => ({
  userId: user?.userId ? String(user.userId) : "",
  nickName: user?.nickName ?? "",
  username: user?.username ?? user?.phonenumber ?? "",
  age: user?.age ?? "",
  sex: user?.sex ?? "",
  height: user?.height ?? "",
  weight: user?.weight ?? "",
  address: user?.address ?? "",
})

const isBlacklisted = (user?: AppUser | null) =>
  user?.status === "0" || user?.state === 0

const TABLE_SCHEMA: TableFieldSchema<AppUser>[] = [
  { colKey: "userId", title: "用户编号", width: 120 },
  { colKey: "nickName", title: "用户姓名", width: 160, ellipsis: true },
  {
    colKey: "username",
    title: "手机号",
    width: 180,
    render: (row) => row.username ?? row.phonenumber ?? "-",
  },
  {
    colKey: "status",
    title: "用户状态",
    width: 140,
    render: (row) => {
      const status = getUserStatus(row)
      return (
        <Tag theme={status.theme} variant="light">
          {status.label}
        </Tag>
      )
    },
  },
  {
    colKey: "createTime",
    title: "注册时间",
    width: 200,
    render: (row) => formatTime(row.createTime),
  },
]

const UserManagement = () => {
  const [query, setQuery] = useState<AppUserQuery>(DEFAULT_QUERY)
  const [userId, setUserId] = useState("")
  const [nickName, setNickName] = useState("")
  const [username, setUsername] = useState("")
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [editing, setEditing] = useState<AppUser | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [blacklisted, setBlacklisted] = useState(false)
  const [qtnVisible, setQtnVisible] = useState(false)
  const [qtnUserId, setQtnUserId] = useState<number | undefined>(undefined)
  const [qtnUserName, setQtnUserName] = useState<string>("")
  const [form] = Form.useForm()

  const { data, loading, runAsync } = useRequest(() => listAppUsers(query), {
    refreshDeps: [JSON.stringify(query)],
  })

  const records = useMemo(() => data?.record ?? [], [data])

  const handleSearch = () => {
    setQuery((prev) => ({
      ...prev,
      pageNum: 1,
      userId: userId.trim() || undefined,
      nickName: nickName.trim() || undefined,
      username: username.trim() || undefined,
    }))
  }

  const handleReset = () => {
    setUserId("")
    setNickName("")
    setUsername("")
    setQuery(DEFAULT_QUERY)
  }

  const handleCloseDrawer = () => {
    setDrawerVisible(false)
    setEditing(null)
    setBlacklisted(false)
    form.reset()
  }

  const openDrawer = async (user: AppUser) => {
    setDrawerVisible(true)
    setEditing(user)
    form.setFieldsValue(buildFormValues(user))
    setBlacklisted(isBlacklisted(user))
    if (!user.userId) return
    try {
      setDetailLoading(true)
      const detail = await getAppUserDetail(user.userId)
      setEditing(detail)
      form.setFieldsValue(buildFormValues(detail))
      setBlacklisted(isBlacklisted(detail))
    } finally {
      setDetailLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!editing?.userId) return
    const valid = await form.validate()
    if (valid !== true) return
    const values = form.getFieldsValue(true) as Record<string, unknown>
    const phone = String(values.username ?? "")
    const payload: AppUserInput = {
      userId: editing.userId,
      areaCode: editing.areaCode ?? "86",
      username: phone,
      phonenumber: phone,
      nickName: String(values.nickName ?? ""),
      sex: values.sex ? String(values.sex) : undefined,
      age: toNumber(values.age),
      height: values.height ? String(values.height) : undefined,
      weight: values.weight ? String(values.weight) : undefined,
      address: values.address ? String(values.address) : undefined,
      status: blacklisted ? "0" : "1",
      role: editing.role ?? "5",
    }

    await updateAppUser(payload)
    MessagePlugin.success("保存成功")
    handleCloseDrawer()
    runAsync()
  }

  const handleDelete = async (user: AppUser) => {
    if (!user.userId || !user.username) {
      MessagePlugin.error("缺少用户信息，无法删除")
      return
    }
    await updateAppUser({
      userId: user.userId,
      username: user.username,
      areaCode: user.areaCode ?? "86",
      status: "0",
      role: user.role ?? "5",
    })
    MessagePlugin.success("已删除")
    runAsync()
  }

  const openQtnDrawer = (user: AppUser) => {
    if (!user.userId) {
      MessagePlugin.error("缺少用户编号")
      return
    }
    setQtnUserId(user.userId)
    setQtnUserName(user.nickName ?? user.username ?? "用户")
    setQtnVisible(true)
  }

  const handleChangePage = (pageInfo: {
    current: number
    pageSize: number
  }) => {
    setQuery((prev) => ({
      ...prev,
      pageNum: pageInfo.current,
      pageSize: pageInfo.pageSize,
    }))
  }

  const columns = buildTableColumns<AppUser>([
    ...TABLE_SCHEMA,
    {
      colKey: "actions",
      title: "操作",
      width: 220,
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
          <Button
            theme="primary"
            variant="text"
            onClick={() => openQtnDrawer(row)}
          >
            问诊记录
          </Button>
          <Popconfirm
            content="确定删除该用户吗？"
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

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex-1 overflow-auto bg-neutral-50 p-8">
        <div className="rounded-xl border border-border bg-white p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3  items-center gap-4">
            <Input
              value={userId}
              onChange={(value) => setUserId(value)}
              onEnter={handleSearch}
              placeholder="请输入用户编号"
              className="w-[200px]"
              suffixIcon={<SearchIcon size={16} />}
            />
            <Input
              value={nickName}
              onChange={(value) => setNickName(value)}
              onEnter={handleSearch}
              placeholder="请输入用户姓名"
              className="w-[200px]"
            />
            <Input
              value={username}
              onChange={(value) => setUsername(value)}
              onEnter={handleSearch}
              placeholder="请输入手机号"
              className="w-[200px]"
            />
            <div className="flex items-center gap-2">
              <Button theme="primary" onClick={handleSearch}>
                查询
              </Button>
              <Button variant="text" onClick={handleReset}>
                重置
              </Button>
            </div>
          </div>

          <div className="my-6 border-t border-border" />

          <div className="overflow-x-auto">
            <Table
              columns={columns}
              tableLayout="fixed"
              className="w-full min-w-full"
              data={records}
              rowKey="userId"
              loading={loading}
              empty="暂无用户数据"
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
        className="user-drawer"
        header="信息管理"
        visible={drawerVisible}
        placement="right"
        size="760px"
        onClose={handleCloseDrawer}
        footer={
          <div className="flex items-center gap-2">
            <Button
              theme="primary"
              onClick={handleSubmit}
              disabled={detailLoading}
            >
              保存
            </Button>
            <Button variant="outline" onClick={handleCloseDrawer}>
              取消
            </Button>
          </div>
        }
      >
        <Form
          form={form}
          layout="inline"
          colon={false}
          labelWidth={96}
          labelAlign="left"
          className="grid grid-cols-2 gap-x-8 gap-y-6"
        >
          <Form.FormItem
            name="nickName"
            label="用户姓名"
            rules={[{ required: true, message: "请输入用户姓名" }]}
            className="w-full"
          >
            <Input placeholder="请输入用户姓名" />
          </Form.FormItem>
          <Form.FormItem name="userId" label="用户编号" className="w-full">
            <Input disabled />
          </Form.FormItem>
          <Form.FormItem
            name="username"
            label="手机号"
            rules={[{ required: true, message: "请输入手机号" }]}
            className="w-full"
          >
            <Input placeholder="请输入手机号" />
          </Form.FormItem>
          <Form.FormItem name="age" label="年龄" className="w-full">
            <InputAdornment append="岁" className="w-full">
              <Input placeholder="请输入年龄" />
            </InputAdornment>
          </Form.FormItem>
          <Form.FormItem name="sex" label="性别" className="w-full">
            <Radio.Group options={SEX_OPTIONS} />
          </Form.FormItem>
          <Form.FormItem name="height" label="身高" className="w-full">
            <InputAdornment append="cm" className="w-full">
              <Input placeholder="请输入身高" />
            </InputAdornment>
          </Form.FormItem>
          <Form.FormItem name="weight" label="体重" className="w-full">
            <InputAdornment append="kg" className="w-full">
              <Input placeholder="请输入体重" />
            </InputAdornment>
          </Form.FormItem>
          <Form.FormItem name="address" label="地址" className="col-span-2">
            <Input placeholder="请输入地址" />
          </Form.FormItem>
          <div className="col-span-2 flex items-center gap-4">
            <span className="text-sm text-neutral-950/90">是否拉黑</span>
            <Switch value={blacklisted} onChange={setBlacklisted} />
          </div>
        </Form>
      </Drawer>

      <QtnRecordsDrawer
        userId={qtnUserId}
        userName={qtnUserName}
        visible={qtnVisible}
        onClose={() => setQtnVisible(false)}
      />
    </div>
  )
}

export const Route = createFileRoute("/_herb/users")({
  component: UserManagement,
})
