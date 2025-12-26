import dayjs from "dayjs"
import { useMemo, type ReactNode } from "react"
import {
  Button,
  Checkbox,
  Drawer,
  Loading,
  MessagePlugin,
  Pagination,
  DialogPlugin,
  Radio,
  Select,
  Table,
  Tag,
} from "tdesign-react"
import { ChevronLeftIcon, CloseIcon, TimeIcon } from "tdesign-icons-react"
import { shallow } from "zustand/shallow"

import { useRequest } from "~/hooks/useRequest"
import {
  getConsultationDetail,
  listAppUserQtn,
  type ConsultationDetail,
  type ConsultationInfo,
  type QtnMain,
  type QtnRecord,
  type QtnRecordPage,
} from "~/services/app-user-qtn"
import {
  DEFAULT_QTN_PAGE,
  useQtnRecordsStore,
} from "~/stores/qtn-records-store"

const MAX_COMPARE_COUNT = 3
const MAX_QTN_PAGE_SIZE = 100

const formatDateTime = (value?: string | null) => {
  if (!value) return "-"
  const date = dayjs(value)
  return date.isValid() ? date.format("YYYY.MM.DD HH:mm") : "-"
}

const formatDate = (value?: string | null) => {
  if (!value) return "-"
  const date = dayjs(value)
  return date.isValid() ? date.format("YYYY.MM.DD") : "-"
}

const normalizeAnswer = (value?: string | null) => {
  if (!value) return "-"
  const trimmed = String(value).trim()
  if (!trimmed) return "-"
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean).join("、") || "-"
      }
      if (typeof parsed === "object" && parsed) {
        return JSON.stringify(parsed)
      }
    } catch {
      return trimmed
    }
  }
  return trimmed
}

const parseImages = (value?: string | null) => {
  if (!value) return []
  const trimmed = String(value).trim()
  if (!trimmed) return []
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as string[]
      return Array.isArray(parsed) ? parsed.filter(Boolean) : []
    } catch {
      return []
    }
  }
  if (trimmed.includes(",")) {
    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return [trimmed]
}

const findAnswerByProfile = (
  questions: QtnMain["questions"],
  keys: string[]
) => {
  if (!questions?.length) return "-"
  const target = questions.find((item) =>
    keys.some((key) => item.profileField?.includes(key))
  )
  return normalizeAnswer(target?.userAnswer ?? target?.other ?? "-")
}

const findAnswerByKeywords = (
  questions: QtnMain["questions"],
  keywords: string[]
) => {
  if (!questions?.length) return "-"
  const target = questions.find((item) =>
    keywords.some((key) => item.title?.includes(key))
  )
  return normalizeAnswer(target?.userAnswer ?? target?.other ?? "-")
}

const findImagesByKeywords = (
  questions: QtnMain["questions"],
  keywords: string[]
) => {
  if (!questions?.length) return []
  const target = questions.find((item) =>
    keywords.some((key) => item.title?.includes(key))
  )
  return parseImages(target?.userAnswer ?? target?.other ?? "")
}

const buildSnapshot = (
  detail?: QtnMain | null,
  consultation?: ConsultationInfo | null
) => {
  const questions = detail?.questions ?? []
  const symptomLevel = detail?.symptomLevel ?? {}
  const symptomTags = Object.entries(symptomLevel).map(([key, value]) => ({
    label: `${key}（${value}）`,
    level: Number(value),
  }))

  return {
    baseInfo: [
      findAnswerByProfile(questions, ["sex"]),
      findAnswerByProfile(questions, ["age"]),
      findAnswerByProfile(questions, ["height"]),
      findAnswerByProfile(questions, ["weight"]),
    ],
    vitals: [
      findAnswerByProfile(questions, ["dia"]),
      findAnswerByProfile(questions, ["sys"]),
      findAnswerByProfile(questions, ["hr"]),
      findAnswerByProfile(questions, ["bg"]),
    ],
    images: [
      findImagesByKeywords(questions, ["脸", "面部"]),
      findImagesByKeywords(questions, ["舌苔", "舌"]),
      findImagesByKeywords(questions, ["左手"]),
      findImagesByKeywords(questions, ["右手"]),
      findImagesByKeywords(questions, ["小便", "尿"]),
    ],
    history: [
      findAnswerByKeywords(questions, ["既往病史"]),
      findAnswerByKeywords(questions, ["过敏史", "家族史", "既往"]),
      findAnswerByKeywords(questions, ["病情", "描述"]),
      findAnswerByKeywords(questions, ["药物", "用药"]),
    ],
    habits: [
      findAnswerByKeywords(questions, ["饮食"]),
      findAnswerByKeywords(questions, ["作息"]),
      findAnswerByKeywords(questions, ["生活习惯"]),
      findAnswerByKeywords(questions, ["工作环境", "手机"]),
      findAnswerByKeywords(questions, ["情绪"]),
    ],
    complexion: [
      findAnswerByKeywords(questions, ["面色"]),
      findAnswerByKeywords(questions, ["手部"]),
      findAnswerByKeywords(questions, ["脚部"]),
      findAnswerByKeywords(questions, ["流汗"]),
      findAnswerByKeywords(questions, ["寒热"]),
      findAnswerByKeywords(questions, ["胃口"]),
    ],
    status: [
      findAnswerByKeywords(questions, ["身体状态"]),
      findAnswerByKeywords(questions, ["疼痛"]),
      findAnswerByKeywords(questions, ["妇科", "月经"]),
    ],
    diagnosis: [
      consultation?.advisorMsg ??
        findAnswerByKeywords(questions, ["健康顾问备注"]),
      consultation?.doctorMsg ??
        findAnswerByKeywords(questions, ["医生诊断"]),
      consultation?.adviceMsg ??
        findAnswerByKeywords(questions, ["治疗建议"]),
    ],
    symptomTags,
  }
}

const renderTagList = (tags: { label: string; level: number }[]) => {
  if (!tags.length) return "-"
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((item) => {
        const theme =
          item.level >= 4 ? "danger" : item.level >= 3 ? "warning" : "default"
        return (
          <Tag key={item.label} theme={theme} variant="light">
            {item.label}
          </Tag>
        )
      })}
    </div>
  )
}

const renderImages = (images: string[]) => {
  if (!images.length) return "-"
  return (
    <div className="flex items-center gap-3">
      {images.slice(0, 3).map((src) => (
        <div
          key={src}
          className="flex size-16 items-center justify-center rounded border border-border bg-neutral-50"
        >
          <img src={src} alt="" className="size-14 object-contain" />
        </div>
      ))}
    </div>
  )
}

const TableBlock = ({
  headers,
  rows,
  rowHeaders,
}: {
  headers: string[]
  rows: Array<Array<ReactNode>>
  rowHeaders?: ReactNode[]
}) => {
  return (
    <div className="overflow-hidden rounded border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-neutral-100 text-neutral-500">
            {rowHeaders ? <th className="w-[180px] px-4 py-2" /> : null}
            {headers.map((header) => (
              <th key={header} className="px-4 py-2 text-left font-normal">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-border">
              {rowHeaders ? (
                <td className="bg-neutral-100 px-4 py-3 text-neutral-500">
                  {rowHeaders[rowIndex]}
                </td>
              ) : null}
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 text-neutral-900">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const DetailView = ({
  record,
  detail,
  userName,
  onBack,
  onClose,
}: {
  record: QtnRecord
  detail: ConsultationDetail | null
  userName: string
  onBack: () => void
  onClose: () => void
}) => {
  const snapshot = buildSnapshot(detail?.qtnMainVO, detail?.consultation)
  const recordTime = formatDateTime(record.createTime ?? record.createDate)

  return (
    <div className="px-6 pb-8 pt-4">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <button
          type="button"
          className="flex items-center gap-2 text-sm text-neutral-950/80 hover:text-neutral-950"
          onClick={onBack}
        >
          <ChevronLeftIcon size={16} />
          返回
        </button>
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded hover:bg-neutral-100"
          onClick={onClose}
        >
          <CloseIcon size={16} />
        </button>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-xl font-semibold text-neutral-950">
          {userName}的问卷 {record.batchNo ?? "-"}
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <TimeIcon size={16} />
          {recordTime}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <TableBlock
          headers={["性别", "年龄", "身高（cm）", "体重（kg）"]}
          rows={[snapshot.baseInfo]}
        />
        <TableBlock
          headers={[
            "血压低压（mmHg）",
            "血压高压（mmHg）",
            "心率（次/分钟）",
            "空腹血糖（mmol/L）",
          ]}
          rows={[snapshot.vitals]}
        />
        <TableBlock
          headers={["脸部", "舌苔", "左手掌", "右手掌", "小便"]}
          rows={[
            snapshot.images.map((images) => renderImages(images ?? [])),
          ]}
        />
        <TableBlock
          headers={["既往病史", "既往病史", "描述病情", "药物使用情况"]}
          rows={[snapshot.history]}
        />
        <TableBlock
          headers={[
            "饮食偏好",
            "作息时间",
            "生活习惯",
            "工作环境及手机使用习惯",
            "情绪压力",
          ]}
          rows={[snapshot.habits]}
        />
        <TableBlock
          headers={["面色", "手部", "脚部", "流汗", "寒热", "胃口"]}
          rows={[snapshot.complexion]}
        />
        <TableBlock
          headers={["身体状态", "疼痛", "妇科月经状态"]}
          rows={[
            [
              renderTagList(snapshot.symptomTags),
              snapshot.status[1],
              snapshot.status[2],
            ],
          ]}
        />
        <div className="flex items-center gap-2 text-sm font-semibold text-brand">
          <span className="inline-flex size-3 items-center justify-center rounded bg-brand text-white">
            ✓
          </span>
          诊断报告
        </div>
        <TableBlock
          headers={["健康顾问备注", "医生诊断", "治疗建议"]}
          rows={[snapshot.diagnosis]}
        />
      </div>
    </div>
  )
}

const CompareView = ({
  records,
  details,
  userName,
  onBack,
  onClose,
}: {
  records: QtnRecord[]
  details: ConsultationDetail[]
  userName: string
  onBack: () => void
  onClose: () => void
}) => {
  const snapshots = details.map((detail) =>
    buildSnapshot(detail.qtnMainVO, detail.consultation)
  )
  const rowHeaders = records.map((record) => (
    <div className="text-sm text-neutral-500">
      {record.batchNo ?? "-"}（{formatDate(record.createTime ?? record.createDate)}）
    </div>
  ))

  const rowsByField = (getter: (snapshot: ReturnType<typeof buildSnapshot>) => string[]) =>
    snapshots.map((snapshot) => getter(snapshot))

  return (
    <div className="px-6 pb-8 pt-4">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <button
          type="button"
          className="flex items-center gap-2 text-sm text-neutral-950/80 hover:text-neutral-950"
          onClick={onBack}
        >
          <ChevronLeftIcon size={16} />
          返回
        </button>
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded hover:bg-neutral-100"
          onClick={onClose}
        >
          <CloseIcon size={16} />
        </button>
      </div>

      <div className="mt-6 text-xl font-semibold text-neutral-950">
        {userName}的问诊记录对比
      </div>

      <div className="mt-6 space-y-4">
        <TableBlock
          headers={["性别", "年龄", "身高（cm）", "体重（kg）"]}
          rows={rowsByField((snapshot) => snapshot.baseInfo)}
          rowHeaders={rowHeaders}
        />
        <TableBlock
          headers={[
            "血压低压（mmHg）",
            "血压高压（mmHg）",
            "心率（次/分钟）",
            "空腹血糖（mmol/L）",
          ]}
          rows={rowsByField((snapshot) => snapshot.vitals)}
          rowHeaders={rowHeaders}
        />
        <TableBlock
          headers={["脸部", "舌苔", "左手掌", "右手掌", "小便"]}
          rows={snapshots.map((snapshot) =>
            snapshot.images.map((images) => renderImages(images ?? []))
          )}
          rowHeaders={rowHeaders}
        />
        <TableBlock
          headers={["既往病史", "既往病史", "描述病情", "药物使用情况"]}
          rows={rowsByField((snapshot) => snapshot.history)}
          rowHeaders={rowHeaders}
        />
        <TableBlock
          headers={[
            "饮食偏好",
            "作息时间",
            "生活习惯",
            "工作环境及手机使用习惯",
            "情绪压力",
          ]}
          rows={rowsByField((snapshot) => snapshot.habits)}
          rowHeaders={rowHeaders}
        />
        <TableBlock
          headers={["面色", "手部", "脚部", "流汗", "寒热", "胃口"]}
          rows={rowsByField((snapshot) => snapshot.complexion)}
          rowHeaders={rowHeaders}
        />
        <TableBlock
          headers={["身体状态", "疼痛", "妇科月经状态"]}
          rows={snapshots.map((snapshot) => [
            renderTagList(snapshot.symptomTags),
            snapshot.status[1],
            snapshot.status[2],
          ])}
          rowHeaders={rowHeaders}
        />
        <div className="flex items-center gap-2 text-sm font-semibold text-brand">
          <span className="inline-flex size-3 items-center justify-center rounded bg-brand text-white">
            ✓
          </span>
          诊断报告
        </div>
        <TableBlock
          headers={["健康顾问备注", "医生诊断", "治疗建议"]}
          rows={rowsByField((snapshot) => snapshot.diagnosis)}
          rowHeaders={rowHeaders}
        />
      </div>
    </div>
  )
}

export interface QtnRecordsDrawerProps {
  userId?: number
  userName?: string
  visible: boolean
  onClose: () => void
}

export const QtnRecordsDrawer = ({
  userId,
  userName,
  visible,
  onClose,
}: QtnRecordsDrawerProps) => {
  const {
    page,
    mode,
    view,
    selected,
    activeRecord,
    detailData,
    compareData,
    symptomFilter,
    setState,
    setPage,
    reset,
  } = useQtnRecordsStore(
    (state) => ({
      page: state.page,
      mode: state.mode,
      view: state.view,
      selected: state.selected,
      activeRecord: state.activeRecord,
      detailData: state.detailData,
      compareData: state.compareData,
      symptomFilter: state.symptomFilter,
      setState: state.setState,
      setPage: state.setPage,
      reset: state.reset,
    }),
    shallow
  )

  const emptyPage: QtnRecordPage = {
    record: [],
    total: 0,
    pageNum: page.pageNum ?? DEFAULT_QTN_PAGE.pageNum,
    pageSize: page.pageSize ?? DEFAULT_QTN_PAGE.pageSize,
  }

  const { data, loading } = useRequest(
    () =>
      userId
        ? listAppUserQtn({
            userId,
            pageNum: 1,
            pageSize: MAX_QTN_PAGE_SIZE,
          })
        : Promise.resolve(emptyPage),
    {
      refreshDeps: [userId, JSON.stringify(page)],
    }
  )
  const { runAsync: runConsultationDetail, loading: detailLoading } = useRequest(
    (batchNo: string) => getConsultationDetail(batchNo),
    { manual: true }
  )

  const records = useMemo(() => data?.record ?? [], [data])
  const symptomOptions = useMemo(() => {
    const unique = Array.from(
      new Set(records.map((item) => item.symptom).filter(Boolean))
    ) as string[]
    return ["全部症状", ...unique]
  }, [records])

  const filteredRecords = useMemo(() => {
    if (symptomFilter === "全部症状") return records
    return records.filter((item) => item.symptom === symptomFilter)
  }, [records, symptomFilter])

  const resetState = () => {
    reset()
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const toggleSelect = (record: QtnRecord, checked: boolean) => {
    if (!record.batchNo) return
    if (checked) {
      if (selected.length >= MAX_COMPARE_COUNT) {
        MessagePlugin.warning(`最多选择${MAX_COMPARE_COUNT}条记录`)
        return
      }
      setState((state) => ({ selected: [...state.selected, record] }))
    } else {
      setState((state) => ({
        selected: state.selected.filter(
          (item) => item.batchNo !== record.batchNo
        ),
      }))
    }
  }

  const openDetail = async (record: QtnRecord) => {
    if (!record.batchNo) {
      MessagePlugin.error("缺少问诊记录编号")
      return
    }
    setState({ activeRecord: record, view: "detail" })
    const detail = await runConsultationDetail(record.batchNo)
    setState({ detailData: detail })
  }

  const openCompare = async () => {
    if (selected.length < 2) {
      MessagePlugin.warning("请选择至少两条记录进行对比")
      return
    }
    const details = await Promise.all(
      selected
        .filter((record) => record.batchNo)
        .map((record) => runConsultationDetail(record.batchNo as string))
    )
    setState({ compareData: details, view: "compare" })
  }

  const handleDelete = (record: QtnRecord) => {
    const label = record.batchNo ?? "该记录"
    const dialog = DialogPlugin.confirm({
      header: "确认删除",
      body: `确定删除问诊记录${label}吗？`,
      confirmBtn: "删除",
      cancelBtn: "取消",
      onConfirm: () => {
        MessagePlugin.info("暂无删除接口")
        dialog.hide()
      },
      onClose: () => dialog.hide(),
    })
  }

  const baseColumns = [
    {
      colKey: "batchNo",
      title: "问诊编号",
      width: 150,
      cell: ({ row }: { row: QtnRecord }) => (
        <span className="block max-w-[120px] truncate">
          {row.batchNo ?? "-"}
        </span>
      ),
    },
    { colKey: "name", title: "患者姓名", width: 150 },
    {
      colKey: "createTime",
      title: "创建日期",
      width: 170,
      cell: ({ row }: { row: QtnRecord }) =>
        formatDateTime(row.createTime ?? row.createDate),
    },
    {
      colKey: "updateTime",
      title: "更新日期",
      width: 170,
      cell: ({ row }: { row: QtnRecord }) =>
        formatDateTime(row.updateTime ?? row.updateDate),
    },
  ]

  const tableColumns =
    mode === "compare"
      ? [
          ...baseColumns,
          {
            colKey: "select",
            title: "对比",
            width: 120,
            cell: ({ row }: { row: QtnRecord }) => (
              <Checkbox
                checked={selected.some(
                  (item) => item.batchNo && item.batchNo === row.batchNo
                )}
                onChange={(checked) => toggleSelect(row, checked)}
              />
            ),
          },
        ]
      : [
          ...baseColumns,
          {
            colKey: "actions",
            title: "操作",
            width: 140,
            cell: ({ row }: { row: QtnRecord }) => (
              <div className="flex items-center gap-3">
                <Button
                  variant="text"
                  theme="primary"
                  onClick={() => openDetail(row)}
                >
                  详情
                </Button>
                <Button
                  variant="text"
                  theme="danger"
                  onClick={() => handleDelete(row)}
                >
                  删除
                </Button>
              </div>
            ),
          },
        ]

  const listView = (
    <div className="px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Radio.Group
          theme="button"
          variant="outline"
          value={mode}
          onChange={(value) => {
            const nextMode = String(value) as "normal" | "compare"
            if (nextMode === mode) return
            if (nextMode === "normal") {
              setState({ mode: "normal", selected: [] })
              return
            }
            setState({ mode: "compare" })
          }}
          options={[
            { label: "普通模式", value: "normal" },
            { label: "对比模式", value: "compare" },
          ]}
          className="qtn-segment"
        />
        <Select
          value={symptomFilter}
          onChange={(value) => setState({ symptomFilter: String(value) })}
          options={symptomOptions.map((item) => ({ label: item, value: item }))}
          className="w-[180px]"
        />
      </div>

      <div className="mt-6">
        <Table
          columns={
            mode === "compare"
              ? [
                  ...baseColumns,
                  {
                    colKey: "select",
                    title: "对比",
                    width: 120,
                    cell: ({ row }: { row: QtnRecord }) => {
                      const lockedName = selected[0]?.name
                      const isLocked =
                        Boolean(lockedName) && row.name !== lockedName
                      const isChecked = selected.some(
                        (item) => item.batchNo && item.batchNo === row.batchNo
                      )
                      return (
                        <Checkbox
                          checked={isChecked}
                          disabled={isLocked}
                          onChange={(checked) => toggleSelect(row, checked)}
                        />
                      )
                    },
                  },
                ]
              : tableColumns
          }
          tableLayout="fixed"
          data={filteredRecords}
          rowKey="batchNo"
          loading={loading}
          empty="暂无问诊记录"
        />
      </div>
    </div>
  )

  return (
    <Drawer
      className="qtn-drawer"
      header={view === "list" ? `${userName ?? "用户"}的问诊记录` : false}
      visible={visible}
      placement="right"
      size="760px"
      onClose={handleClose}
      closeBtn={view === "list" ? true : false}
      footer={
        view === "list" && mode === "compare" ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button theme="primary" onClick={openCompare}>
                开始对比
              </Button>
              <Button
                variant="outline"
                onClick={() => setState({ selected: [] })}
              >
                取消选择
              </Button>
            </div>
            <span
              className={`text-sm ${
                selected.length >= 2 ? "text-brand" : "text-neutral-500"
              }`}
            >
              已选择{selected.length}条记录（最多选择{MAX_COMPARE_COUNT}条记录）
            </span>
          </div>
        ) : null
      }
    >
      <Loading loading={detailLoading}>
        {view === "list" ? (
          listView
        ) : null}
        {view === "detail" && activeRecord ? (
          <DetailView
            record={activeRecord}
            detail={detailData}
            userName={userName ?? "用户"}
            onBack={() => setState({ view: "list" })}
            onClose={handleClose}
          />
        ) : null}
        {view === "compare" ? (
          <CompareView
            records={selected}
            details={compareData}
            userName={userName ?? "用户"}
            onBack={() => setState({ view: "list" })}
            onClose={handleClose}
          />
        ) : null}
      </Loading>
    </Drawer>
  )
}
