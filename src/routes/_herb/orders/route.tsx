import { createFileRoute } from "@tanstack/react-router"
import dayjs from "dayjs"
import { useMemo, useState } from "react"
import { MoreIcon } from "tdesign-icons-react"
import {
  Button,
  DateRangePicker,
  DialogPlugin,
  Dropdown,
  Form,
  Input,
  Pagination,
  Select,
  Table,
  Tag,
} from "tdesign-react"

import { buildTableColumns, type TableFieldSchema } from "~/components"
import { OrderDetailDrawer } from "~/components/order/order-detail-drawer"
import { useRequest } from "~/hooks/useRequest"
import { listEmployees } from "~/services/employees"
import {
  cancelBackendOrder,
  deleteBackendOrder,
  listBackendOrders,
  type Order,
  type OrderListQuery,
} from "~/services/orders"

type DropdownItem = { content: string; value: string; disabled?: boolean }

const toNumber = (value: unknown) => {
  if (value === "" || value === null || value === undefined) return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

const formatTime = (value?: string | null) => {
  if (!value) return "-"
  const date = dayjs(value)
  return date.isValid() ? date.format("YYYY/MM/DD HH:mm") : "-"
}

const getDoctorName = (row: Order) => {
  const record = row as unknown as Record<string, unknown>
  const candidates = [
    record.doctorName,
    record.doctorNickName,
    record.doctor,
    record.doctorUserName,
  ]
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return "-"
}

const getStatusTag = (status?: number | null) => {
  if (status === 0) return { label: "待支付", theme: "warning" as const }
  if (status === 1) return { label: "已支付", theme: "success" as const }
  if (status === 2) return { label: "已取消", theme: "default" as const }
  if (status === 3) return { label: "支付中", theme: "warning" as const }
  return { label: "-", theme: "default" as const }
}

const DEFAULT_QUERY: OrderListQuery = {
  pageNum: 1,
  pageSize: 20,
}

export const Route = createFileRoute("/_herb/orders")({
  component: OrderManagement,
})

function OrderManagement() {
  const [form] = Form.useForm()
  const [query, setQuery] = useState<OrderListQuery>(DEFAULT_QUERY)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [activeOrder, setActiveOrder] = useState<{
    orderId?: number
    orderNum?: string
  } | null>(null)

  const { data: doctorsData } = useRequest(
    () => listEmployees({ pageNum: 1, pageSize: 200, role: "3" }),
    { refreshDeps: [] }
  )

  const doctors = useMemo(() => doctorsData?.record ?? [], [doctorsData])
  const doctorOptions = useMemo(
    () =>
      doctors
        .filter((item) => item.userId !== null && item.userId !== undefined)
        .map((item) => ({
          label: item.nickName ?? item.username ?? `医生${item.userId}`,
          value: String(item.userId),
        })),
    [doctors]
  )

  const { data, loading, runAsync } = useRequest(() => listBackendOrders(query), {
    refreshDeps: [JSON.stringify(query)],
  })

  const records = useMemo(() => data?.record ?? [], [data])
  const total = data?.total ?? 0
  const pageNum = data?.pageNum ?? query.pageNum ?? 1
  const pageSize = data?.pageSize ?? query.pageSize ?? 20

  const openDetail = (row: Order) => {
    setActiveOrder({
      orderId: row.orderId ?? undefined,
      orderNum: row.orderNum ?? undefined,
    })
    setDrawerVisible(true)
  }

  const handleSearch = () => {
    const values = form.getFieldsValue(true) as Record<string, unknown>
    const userName = typeof values.userName === "string" ? values.userName.trim() : ""
    const doctorId = toNumber(values.doctorId)
    const status = toNumber(values.status)
    const dateRange = values.dateRange as unknown
    const beginTime =
      Array.isArray(dateRange) && typeof dateRange[0] === "string"
        ? dateRange[0]
        : undefined
    const endTime =
      Array.isArray(dateRange) && typeof dateRange[1] === "string"
        ? dateRange[1]
        : undefined

    setQuery((prev) => ({
      ...prev,
      pageNum: 1,
      userName: userName || undefined,
      doctorId,
      status,
      beginTime,
      endTime,
    }))
  }

  const handleReset = () => {
    form.reset()
    setQuery(DEFAULT_QUERY)
  }

  const handleChangePage = (pageInfo: { current: number; pageSize: number }) => {
    setQuery((prev) => ({
      ...prev,
      pageNum: pageInfo.current,
      pageSize: pageInfo.pageSize,
    }))
  }

  const runCancel = async (row: Order) => {
    if (!row.orderId) return
    const ok = await cancelBackendOrder(row.orderId)
    if (ok) runAsync()
  }

  const runDelete = async (row: Order) => {
    if (!row.orderId) return
    const ok = await deleteBackendOrder(row.orderId)
    if (ok) runAsync()
  }

  const confirmCancel = (row: Order) => {
    const dialog = DialogPlugin.confirm({
      header: "取消订单",
      body: "确认取消该订单吗？",
      confirmBtn: "确定",
      cancelBtn: "取消",
      onConfirm: async () => {
        await runCancel(row)
        dialog.hide()
      },
      onClose: () => dialog.hide(),
    })
  }

  const confirmDelete = (row: Order) => {
    const dialog = DialogPlugin.confirm({
      header: "删除订单",
      body: "确认删除该订单吗？删除后不可恢复。",
      confirmBtn: "确定",
      cancelBtn: "取消",
      onConfirm: async () => {
        await runDelete(row)
        dialog.hide()
      },
      onClose: () => dialog.hide(),
    })
  }

  const TABLE_SCHEMA: TableFieldSchema<Order>[] = [
    { colKey: "orderNum", title: "订单编号", width: 150 },
    { colKey: "userName", title: "用户姓名", width: 120 },
    {
      colKey: "doctorName",
      title: "问诊医生",
      width: 120,
      render: (row) => getDoctorName(row),
    },
    { colKey: "disease", title: "病种类型", width: 160, ellipsis: true },
    {
      colKey: "createTime",
      title: "创建时间",
      width: 200,
      render: (row) => formatTime(row.createTime ?? null),
    },
    {
      colKey: "status",
      title: "订单状态",
      width: 140,
      render: (row) => {
        const status = getStatusTag(row.status ?? undefined)
        return (
          <Tag theme={status.theme} variant="light">
            {status.label}
          </Tag>
        )
      },
    },
    {
      colKey: "actions",
      title: "操作",
      width: 140,
      fixed: "right",
      render: (row) => {
        const items: DropdownItem[] = [
          {
            content: "取消",
            value: "cancel",
            disabled: row.status === 2,
          },
          {
            content: "删除",
            value: "delete",
          },
        ]

        return (
          <div className="flex items-center gap-2">
            <Button theme="primary" variant="text" onClick={() => openDetail(row)}>
              详情
            </Button>
            <Dropdown
              trigger="click"
              options={items}
              onClick={(item) => {
                if (item.value === "cancel") confirmCancel(row)
                if (item.value === "delete") confirmDelete(row)
              }}
            >
              <Button theme="default" variant="text" shape="square">
                <MoreIcon />
              </Button>
            </Dropdown>
          </div>
        )
      },
    },
  ]

  const columns = buildTableColumns(TABLE_SCHEMA)

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex-1 overflow-auto bg-neutral-50 p-8">
        <div className="rounded-xl border border-border bg-white p-6">
          <Form
            form={form}
            layout="inline"
            colon={false}
            className="flex flex-wrap items-end gap-x-8 gap-y-4"
          >
            <Form.FormItem label="用户姓名" name="userName">
              <Input placeholder="请输入内容" className="w-[200px]" />
            </Form.FormItem>
            <Form.FormItem label="问诊医生" name="doctorId">
              <Select
                placeholder="请选择医生"
                options={doctorOptions}
                className="w-[200px]"
                clearable
              />
            </Form.FormItem>
            <Form.FormItem label="订单状态" name="status">
              <Select
                placeholder="请选择订单状态"
                className="w-[200px]"
                clearable
                options={[
                  { label: "待支付", value: "0" },
                  { label: "已支付", value: "1" },
                  { label: "已取消", value: "2" },
                  { label: "支付中", value: "3" },
                ]}
              />
            </Form.FormItem>
            <Form.FormItem label="创建日期" name="dateRange">
              <DateRangePicker
                enableTimePicker
                format="YYYY-MM-DD HH:mm:ss"
                valueType="YYYY-MM-DD HH:mm:ss"
                placeholder={["开始日期时间", "结束日期时间"]}
                className="w-[360px]"
              />
            </Form.FormItem>
            <div className="flex items-center gap-2">
              <Button theme="primary" onClick={handleSearch}>
                查询
              </Button>
              <Button variant="outline" onClick={handleReset}>
                重置
              </Button>
            </div>
          </Form>

          <div className="my-6 border-t border-border" />

          <div className="overflow-x-auto">
            <Table
              columns={columns}
              tableLayout="fixed"
              className="w-full min-w-full"
              data={records}
              rowKey="orderId"
              loading={loading}
              empty="暂无订单数据"
              cellEmptyContent="-"
            />
          </div>

          <div className="mt-6 flex justify-end">
            <Pagination
              current={pageNum}
              pageSize={pageSize}
              total={total}
              showPageSize
              pageSizeOptions={[10, 20, 50]}
              onChange={handleChangePage}
            />
          </div>
        </div>
      </div>

      <OrderDetailDrawer
        visible={drawerVisible}
        orderId={activeOrder?.orderId}
        orderNum={activeOrder?.orderNum}
        onClose={() => setDrawerVisible(false)}
        onSaved={() => runAsync()}
      />
    </div>
  )
}
