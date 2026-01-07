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
  Loading,
  MessagePlugin,
  Pagination,
  Select,
  Table,
} from "tdesign-react"

import { buildTableColumns, type TableFieldSchema } from "~/components"
import { ConsultationDetailDrawer } from "~/components/consultation/consultation-detail-drawer"
import { useRequest } from "~/hooks/useRequest"
import { listEmployees } from "~/services/employees"
import {
  listConsultations,
  type ConsultationListQuery,
  type ConsultationRow,
} from "~/services/consultation-management"

type DropdownItem = { content: string; value: string; disabled?: boolean }

const toNumber = (value: unknown) => {
  if (value === "" || value === null || value === undefined) return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

const formatTime = (value?: string | null) => {
  if (!value) return "-"
  const date = dayjs(value)
  return date.isValid() ? date.format("YYYY/MM/DD HH:mm") : value
}

const DEFAULT_QUERY: ConsultationListQuery = {
  pageNum: 1,
  pageSize: 20,
}

export const Route = createFileRoute("/_herb/consultations")({
  component: ConsultationManagement,
})

function ConsultationManagement() {
  const [form] = Form.useForm()
  const [query, setQuery] = useState<ConsultationListQuery>(DEFAULT_QUERY)
  const [detailVisible, setDetailVisible] = useState(false)
  const [activeConsultationId, setActiveConsultationId] = useState<number | null>(
    null
  )

  const { data: doctorsData } = useRequest(
    () => listEmployees({ pageNum: 1, pageSize: 200, role: "3" }),
    { refreshDeps: [] }
  )

  const doctorOptions = useMemo(
    () =>
      (doctorsData?.record ?? [])
        .filter((item) => item.userId !== null && item.userId !== undefined)
        .map((item) => ({
          label: item.nickName ?? item.username ?? `医生${item.userId}`,
          value: String(item.userId),
        })),
    [doctorsData]
  )

  const { data, loading } = useRequest(() => listConsultations(query), {
    refreshDeps: [JSON.stringify(query)],
  })

  const records = useMemo(() => data?.record ?? [], [data])
  const total = data?.total ?? 0
  const pageNum = data?.pageNum ?? query.pageNum ?? 1
  const pageSize = data?.pageSize ?? query.pageSize ?? 20

  const handleSearch = () => {
    const values = form.getFieldsValue(true) as Record<string, unknown>
    const userName = typeof values.userName === "string" ? values.userName.trim() : ""
    const doctorId = toNumber(values.doctorId)
    const status = typeof values.status === "string" ? values.status : undefined
    const dateRange = values.dateRange as unknown
    const startTime =
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
      startTime,
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

  const confirmDelete = () => {
    const dialog = DialogPlugin.confirm({
      header: "删除问诊记录",
      body: "暂未提供删除接口",
      confirmBtn: "知道了",
      cancelBtn: null,
      onConfirm: () => dialog.hide(),
      onClose: () => dialog.hide(),
    })
  }

  const TABLE_SCHEMA: TableFieldSchema<ConsultationRow>[] = [
    {
      colKey: "consultationNo",
      title: "问诊/预约编号",
      width: 150,
      render: (row) => row.consultationNo ?? "-",
    },
    { colKey: "userName", title: "用户姓名", width: 120, render: (row) => row.userName ?? "-" },
    { colKey: "patientName", title: "病患姓名", width: 120, render: (row) => row.patientName ?? "-" },
    { colKey: "doctorName", title: "医生姓名", width: 120, render: (row) => row.doctorName ?? "-" },
    {
      colKey: "consultationTime",
      title: "问诊时间",
      width: 200,
      render: (row) => formatTime(row.consultationTime ?? null),
    },
    {
      colKey: "actions",
      title: "操作",
      width: 160,
      fixed: "right",
      render: (row) => {
        const items: DropdownItem[] = [{ content: "删除", value: "delete" }]
        return (
          <div className="flex items-center gap-2">
            <Button
              theme="primary"
              variant="text"
              onClick={() => {
                if (!row.consultationId) {
                  MessagePlugin.warning("缺少问诊ID，无法查看详情")
                  return
                }
                setActiveConsultationId(row.consultationId)
                setDetailVisible(true)
              }}
            >
              查看详情
            </Button>
              <Dropdown
                trigger="click"
                options={items}
                onClick={(item) => {
                if (item.value === "delete") confirmDelete()
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
            <Form.FormItem label="医生姓名" name="doctorId">
              <Select
                placeholder="请选择医生"
                options={doctorOptions}
                className="w-[200px]"
                clearable
              />
            </Form.FormItem>
            <Form.FormItem label="预约状态" name="status">
              <Select
                placeholder="请选择预约状态"
                className="w-[200px]"
                clearable
                options={[
                  { label: "待问诊", value: "0" },
                  { label: "已完成", value: "1" },
                  { label: "已取消", value: "9" },
                ]}
              />
            </Form.FormItem>
            <Form.FormItem label="预约日期" name="dateRange">
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

          <Loading loading={loading}>
            <Table
              data={records}
              columns={columns}
              rowKey="consultationId"
              bordered
              hover
              stripe
              maxHeight="520px"
            />
          </Loading>

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

      <ConsultationDetailDrawer
        visible={detailVisible}
        consultationId={activeConsultationId ?? undefined}
        onClose={() => setDetailVisible(false)}
      />
    </div>
  )
}
