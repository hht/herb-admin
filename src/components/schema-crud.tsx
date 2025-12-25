import type { ReactNode } from "react"
import { useCallback, useMemo, useState } from "react"
import {
  Button,
  Card,
  Drawer,
  Form,
  MessagePlugin,
  Popconfirm,
  Space,
  Table,
} from "tdesign-react"
import type { FormProps, TableProps, TableRowData } from "tdesign-react"

import {
  SchemaForm,
  buildTableColumns,
  type FieldSchema,
  type TableFieldSchema,
} from "~/components"
import { useRequest } from "~/hooks/useRequest"

export interface PageResult<T> {
  record: T[]
  total: number
  pageNum: number
  pageSize: number
}

interface QueryState {
  pageNum?: number
  pageSize?: number
}

interface ActionHelpers<T> {
  openDrawer: (record?: T) => void
  remove?: (record: T) => Promise<void>
}

interface SchemaCrudProps<T extends TableRowData, Q extends QueryState, Input> {
  searchSchema?: FieldSchema[]
  tableSchema: TableFieldSchema<T>[]
  formSchema: FieldSchema[]
  defaultQuery: Q
  rowKey: TableProps<T>["rowKey"]
  list: (query: Q) => Promise<PageResult<T>>
  create: (values: Input) => Promise<unknown>
  update: (values: Input) => Promise<unknown>
  remove?: (record: T) => Promise<unknown>
  detail?: (record: T) => Promise<T>
  formatSearchValues?: (values: Record<string, unknown>) => Partial<Q>
  formatFormValues?: (record: T) => Record<string, unknown>
  mapSubmitValues: (values: Record<string, unknown>, editing: T | null) => Input
  getCreateInitialValues?: () => Record<string, unknown>
  getFormSchema?: (editing: T | null, schema: FieldSchema[]) => FieldSchema[]
  drawerTitle?: { create: string; edit: string }
  tableProps?: Partial<TableProps<T>>
  hideActionColumn?: boolean
  actionColumnProps?: Partial<TableFieldSchema<T>>
  renderActions?: (row: T, helpers: ActionHelpers<T>) => ReactNode
}

export const SchemaCrud = <
  T extends TableRowData,
  Q extends QueryState,
  Input
>({
  searchSchema,
  tableSchema,
  formSchema,
  defaultQuery,
  rowKey,
  list,
  create,
  update,
  remove,
  detail,
  formatSearchValues,
  formatFormValues,
  mapSubmitValues,
  getCreateInitialValues,
  getFormSchema,
  drawerTitle = { create: "新增", edit: "编辑" },
  tableProps,
  hideActionColumn = false,
  actionColumnProps,
  renderActions,
}: SchemaCrudProps<T, Q, Input>) => {
  const [query, setQuery] = useState<Q>(defaultQuery)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [editing, setEditing] = useState<T | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [form] = Form.useForm()
  const [searchForm] = Form.useForm()

  const { data, loading, runAsync } = useRequest(() => list(query), {
    refreshDeps: [JSON.stringify(query)],
  })

  const handleSearch = () => {
    const values = searchForm.getFieldsValue(true)
    const formatted = formatSearchValues
      ? formatSearchValues(values)
      : (values as Partial<Q>)
    setQuery((prev) => ({
      ...prev,
      pageNum: 1,
      ...formatted,
    }))
  }

  const handleReset = () => {
    searchForm.reset()
    setQuery(defaultQuery)
  }

  const fillForm = useCallback(
    (record: T) => {
      const formatted = formatFormValues ? formatFormValues(record) : record
      form.setFieldsValue(formatted)
    },
    [form, formatFormValues]
  )

  const openDrawer = useCallback(
    async (record?: T) => {
      setDrawerVisible(true)
      if (record) {
        setEditing(record)
        fillForm(record)
        if (detail) {
          try {
            setDetailLoading(true)
            const detailData = await detail(record)
            setEditing(detailData)
            fillForm(detailData)
          } finally {
            setDetailLoading(false)
          }
        }
      } else {
        setEditing(null)
        form.reset()
        form.setFieldsValue(
          getCreateInitialValues ? getCreateInitialValues() : {}
        )
      }
    },
    [detail, form, getCreateInitialValues, fillForm]
  )

  const handleSubmit = async () => {
    const valid = await form.validate()
    if (valid !== true) return
    const values = form.getFieldsValue(true)
    const payload = mapSubmitValues(values, editing)
    if (editing) {
      await update(payload)
      MessagePlugin.success("更新成功")
    } else {
      await create(payload)
      MessagePlugin.success("创建成功")
    }
    setDrawerVisible(false)
    runAsync()
  }

  const handleDelete = useCallback(
    async (record: T) => {
      if (!remove) return
      await remove(record)
      MessagePlugin.success("已删除")
      runAsync()
    },
    [remove, runAsync]
  )

  const columns = useMemo(() => {
    if (hideActionColumn) {
      return buildTableColumns<T>(tableSchema)
    }

    const defaultRender = remove
      ? (row: T) => (
          <Space size="small">
            <Button
              theme="primary"
              variant="text"
              onClick={() => openDrawer(row)}
            >
              编辑
            </Button>
            <Popconfirm
              content="确定删除该数据吗？"
              onConfirm={() => handleDelete(row)}
            >
              <Button theme="danger" variant="text">
                删除
              </Button>
            </Popconfirm>
          </Space>
        )
      : (row: T) => (
          <Button
            theme="primary"
            variant="text"
            onClick={() => openDrawer(row)}
          >
            编辑
          </Button>
        )

    const actionColumn: TableFieldSchema<T> = {
      colKey: actionColumnProps?.colKey ?? "actions",
      title: actionColumnProps?.title ?? "操作",
      width: actionColumnProps?.width ?? (remove ? 160 : 120),
      fixed: actionColumnProps?.fixed ?? "right",
      className: actionColumnProps?.className,
      render: (row) =>
        (renderActions ?? defaultRender)(row, {
          openDrawer,
          remove: remove ? (async (record: T) => handleDelete(record)) : undefined,
        }),
    }

    return buildTableColumns<T>([...tableSchema, actionColumn])
  }, [
    tableSchema,
    remove,
    hideActionColumn,
    actionColumnProps,
    renderActions,
    handleDelete,
    openDrawer,
  ])

  const drawerSchema = useMemo(
    () => (getFormSchema ? getFormSchema(editing, formSchema) : formSchema),
    [editing, formSchema, getFormSchema]
  )

  return (
    <div className="space-y-4 min-w-0">
      {searchSchema ? (
        <Card bordered={false} className="rounded-xl min-w-0">
          <SchemaForm
            form={searchForm as FormProps["form"]}
            schema={searchSchema}
            layout="inline"
            colon={false}
            className="gap-4"
            actions={
              <Space size="small">
                <Button theme="primary" onClick={handleSearch}>
                  查询
                </Button>
                <Button onClick={handleReset}>重置</Button>
                <Button
                  theme="primary"
                  variant="outline"
                  onClick={() => openDrawer()}
                >
                  新增
                </Button>
              </Space>
            }
            actionsAlign="end"
          />
        </Card>
      ) : null}

      <Card bordered={false} className="rounded-xl w-full min-w-0">
        <div className="overflow-x-auto min-w-0 max-w-full">
          <Table
            columns={columns}
            tableLayout="fixed"
            className="w-full min-w-full"
            data={data?.record ?? []}
            rowKey={rowKey}
            loading={loading}
            pagination={{
              current: query.pageNum as number,
              pageSize: query.pageSize as number,
              total: data?.total ?? 0,
              onChange: (pageInfo) =>
                setQuery((prev) => ({
                  ...prev,
                  pageNum: pageInfo.current,
                  pageSize: pageInfo.pageSize,
                })),
            }}
            {...tableProps}
          />
        </div>
      </Card>

      <Drawer
        header={editing ? drawerTitle.edit : drawerTitle.create}
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
        <SchemaForm
          form={form as FormProps["form"]}
          schema={drawerSchema}
          layout="vertical"
        />
      </Drawer>
    </div>
  )
}
