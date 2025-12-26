import { createFileRoute } from "@tanstack/react-router"
import dayjs from "dayjs"
import { useMemo } from "react"
import { AddIcon, CloseIcon, SearchIcon } from "tdesign-icons-react"
import {
  Button,
  Drawer,
  Form,
  Input,
  InputAdornment,
  Loading,
  MessagePlugin,
  Pagination,
  Popconfirm,
  Textarea,
} from "tdesign-react"
import { shallow } from "zustand/shallow"

import { useRequest } from "~/hooks/useRequest"
import {
  createHealthTemplate,
  deleteHealthTemplate,
  getHealthTemplateDetail,
  listHealthTemplates,
  updateHealthTemplate,
  type HealthContentInput,
  type HealthTemplate,
  type HealthTemplateInput,
} from "~/services/health-templates"
import {
  DEFAULT_PACKAGE_QUERY,
  createEmptyContent,
  usePackageStore,
} from "~/stores/package-store"

const buildContentState = (template?: HealthTemplate | null) => {
  if (!template?.contents?.length) {
    return [createEmptyContent(0)]
  }
  return template.contents.map((item, index) => ({
    title: item.title ?? `服务${index + 1}`,
    name: item.name ?? "",
    content: item.content ?? "",
  }))
}

const normalizeContents = (contents: HealthContentInput[]) =>
  contents
    .map((item, index) => ({
      title: item.title?.trim() || `服务${index + 1}`,
      name: item.name?.trim() || "",
      content: item.content?.trim() || "",
    }))
    .filter((item, index) => index === 0 || item.name || item.content)

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

const PackageSettings = () => {
  const {
    query,
    keyword,
    drawerVisible,
    editing,
    contents,
    setState,
    setQuery,
    replaceQuery,
  } = usePackageStore(
    (state) => ({
      query: state.query,
      keyword: state.keyword,
      drawerVisible: state.drawerVisible,
      editing: state.editing,
      contents: state.contents,
      setState: state.setState,
      setQuery: state.setQuery,
      replaceQuery: state.replaceQuery,
    }),
    shallow
  )
  const [form] = Form.useForm()

  const { data, loading, runAsync } = useRequest(
    () => listHealthTemplates(query),
    {
      refreshDeps: [JSON.stringify(query)],
    }
  )
  const { runAsync: runDetail, loading: detailLoading } = useRequest(
    (packageId: number) => getHealthTemplateDetail(packageId),
    { manual: true }
  )
  const { runAsync: runCreate, loading: createLoading } = useRequest(
    createHealthTemplate,
    { manual: true }
  )
  const { runAsync: runUpdate, loading: updateLoading } = useRequest(
    updateHealthTemplate,
    { manual: true }
  )
  const { runAsync: runDelete, loading: deleteLoading } = useRequest(
    deleteHealthTemplate,
    { manual: true }
  )

  const cards = useMemo(() => data?.record ?? [], [data])

  const handleSearch = () => {
    setQuery({
      pageNum: 1,
      name: keyword.trim() || undefined,
    })
  }

  const handleReset = () => {
    setState({ keyword: "" })
    replaceQuery(DEFAULT_PACKAGE_QUERY)
  }

  const fillForm = (template: HealthTemplate) => {
    form.setFieldsValue({
      disease: template.disease ?? "",
      name: template.name ?? "",
      price:
        template.price === null || template.price === undefined
          ? ""
          : String(template.price),
      originalPrice:
        template.originalPrice === null || template.originalPrice === undefined
          ? ""
          : String(template.originalPrice),
    })
  }

  const openDrawer = async (template?: HealthTemplate) => {
    setState({ drawerVisible: true })
    if (!template) {
      setState({ editing: null })
      form.reset()
      setState({ contents: [createEmptyContent(0)] })
      return
    }
    setState({ editing: template })
    fillForm(template)
    setState({ contents: buildContentState(template) })
    if (!template.packageId) return
    const detail = await runDetail(template.packageId)
    setState({ editing: detail, contents: buildContentState(detail) })
    fillForm(detail)
  }

  const handleDelete = async (template: HealthTemplate) => {
    if (!template.packageId) return
    await runDelete(template.packageId)
    MessagePlugin.success("已删除")
    runAsync()
  }

  const handleSubmit = async () => {
    const valid = await form.validate()
    if (valid !== true) return
    const requiredContent = contents[0]
    if (!requiredContent?.name?.trim() || !requiredContent?.content?.trim()) {
      MessagePlugin.warning("请完善服务一的名称和内容")
      return
    }

    const values = form.getFieldsValue(true) as Record<string, unknown>
    const normalizedContents = normalizeContents(contents)
    const payload: HealthTemplateInput = {
      packageId: editing?.packageId ?? undefined,
      name: String(values.name ?? ""),
      disease: String(values.disease ?? ""),
      price: toNumber(values.price),
      originalPrice: toNumber(values.originalPrice),
      status: editing?.status ?? "1",
      contents: normalizedContents,
    }

    if (editing) {
      await runUpdate(payload)
      MessagePlugin.success("更新成功")
    } else {
      await runCreate(payload)
      MessagePlugin.success("创建成功")
    }
    setState({ drawerVisible: false })
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

  const handleAddService = () => {
    setState((state) => ({
      contents: [...state.contents, createEmptyContent(state.contents.length)],
    }))
  }

  const handleRemoveService = (index: number) => {
    setState((state) => {
      const next = state.contents.filter((_, itemIndex) => itemIndex !== index)
      return {
        contents: next.map((item, itemIndex) => ({
          ...item,
          title: item.title?.trim() || `服务${itemIndex + 1}`,
        })),
      }
    })
  }

  const updateService = (
    index: number,
    key: keyof HealthContentInput,
    value: string
  ) => {
    setState((state) => ({
      contents: state.contents.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      ),
    }))
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex-1 overflow-auto bg-neutral-50 p-8">
        <div className="rounded-xl border border-border bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Input
              value={keyword}
              onChange={(value) => setState({ keyword: value })}
              onEnter={handleSearch}
              placeholder="搜索套餐名称"
              className="w-[332px]"
              suffixIcon={<SearchIcon size={16} />}
            />
            <div className="flex items-center gap-2">
              <Button variant="text" onClick={handleReset}>
                重置
              </Button>
              <Button
                theme="primary"
                icon={<AddIcon size={16} />}
                onClick={() => openDrawer()}
              >
                创建新套餐
              </Button>
            </div>
          </div>

          <div className="my-6 border-t border-border" />

          <Loading loading={loading}>
            {cards.length === 0 ? (
              <div className="py-12 text-center text-sm text-neutral-600">
                暂无套餐数据
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {cards.map((item, index) => (
                  <div
                    key={item.packageId ?? item.name ?? index}
                    className="flex h-[174px] flex-col justify-between rounded-[6px] border border-border bg-white p-4"
                  >
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-[#1D2129]">
                        {item.name ?? "-"}
                      </div>
                      <div className="text-xs text-neutral-600">
                        更新时间{" "}
                        {formatTime(item.updateTime ?? item.createTime)}
                      </div>
                      <div className="text-xs text-neutral-600">
                        套餐价格 ¥{item.price ?? "-"}
                      </div>
                      <div className="text-xs text-neutral-600">
                        病种 {item.disease ?? "-"}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Popconfirm
                        content="确定删除该套餐吗？"
                        onConfirm={() => handleDelete(item)}
                        confirmBtn={{ loading: deleteLoading }}
                      >
                        <button
                          type="button"
                          className="text-sm text-neutral-600"
                        >
                          ...
                        </button>
                      </Popconfirm>
                      <Button
                        size="small"
                        theme="primary"
                        onClick={() => openDrawer(item)}
                      >
                        管理
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Loading>

          <div className="mt-6 flex justify-end">
            <Pagination
              current={query.pageNum ?? 1}
              pageSize={query.pageSize ?? 8}
              total={data?.total ?? 0}
              onChange={handleChangePage}
            />
          </div>
        </div>
      </div>

      <Drawer
        className="package-drawer"
        header={editing ? "套餐管理" : "创建新套餐"}
        visible={drawerVisible}
        placement="right"
        size="760px"
        onClose={() => setState({ drawerVisible: false })}
        footer={
          <div className="flex items-center gap-2">
            <Button
              theme="primary"
              onClick={handleSubmit}
              loading={createLoading || updateLoading}
              disabled={detailLoading}
            >
              {editing ? "保存" : "创建"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setState({ drawerVisible: false })}
            >
              取消
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" colon={false}>
          <div className="grid grid-cols-2 gap-8">
            <Form.FormItem
              name="disease"
              label="病种"
              rules={[{ required: true, message: "请输入病种" }]}
            >
              <Input placeholder="请输入病种" />
            </Form.FormItem>
            <Form.FormItem
              name="name"
              label="套餐名"
              rules={[{ required: true, message: "请输入套餐名" }]}
            >
              <Input placeholder="请输入套餐名" />
            </Form.FormItem>
          </div>

          <div className="my-6 border-t border-border" />

          <div className="space-y-6">
            {contents.map((service, index) => {
              const isRequired = index === 0
              return (
                <div key={service.title ?? index} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-[#1D2129]">
                      服务{index + 1}
                      {isRequired ? (
                        <span className="ml-1 text-[#F53F3F]">*</span>
                      ) : (
                        <span className="ml-2 text-xs text-neutral-500">
                          （选填）
                        </span>
                      )}
                    </div>
                    {isRequired ? null : (
                      <button
                        type="button"
                        className="flex size-6 items-center justify-center rounded hover:bg-neutral-100"
                        onClick={() => handleRemoveService(index)}
                      >
                        <CloseIcon size={16} className="text-neutral-500" />
                      </button>
                    )}
                  </div>
                  <Input
                    value={service.name ?? ""}
                    onChange={(value) => updateService(index, "name", value)}
                    placeholder="请输入服务名"
                  />
                  <Textarea
                    value={service.content ?? ""}
                    onChange={(value) => updateService(index, "content", value)}
                    placeholder="请输入服务详细内容"
                    autosize={{ minRows: 4, maxRows: 4 }}
                  />
                </div>
              )
            })}
            <button
              type="button"
              className="text-sm text-brand underline"
              onClick={handleAddService}
            >
              添加服务
            </button>
          </div>

          <div className="my-6 border-t border-border" />

          <div className="grid grid-cols-2 gap-8">
            <Form.FormItem
              name="price"
              label="套餐现价"
              labelAlign="top"
              rules={[{ required: true, message: "请输入价格" }]}
            >
              <InputAdornment className="w-full" append="人民币">
                <Input placeholder="请输入价格" />
              </InputAdornment>
            </Form.FormItem>
            <Form.FormItem
              name="originalPrice"
              labelAlign="top"
              label="套餐原价（选填）"
            >
              <InputAdornment className="w-full" append="人民币">
                <Input placeholder="请输入价格" />
              </InputAdornment>
            </Form.FormItem>
          </div>
        </Form>
      </Drawer>
    </div>
  )
}

export const Route = createFileRoute("/_herb/packages")({
  component: PackageSettings,
})
