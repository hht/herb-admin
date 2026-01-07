import dayjs from "dayjs"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CloseIcon } from "tdesign-icons-react"
import { Button, Drawer, Loading, Textarea } from "tdesign-react"

import qtnInfoSvg from "~/assets/figma/qtn-info.svg?raw"
import qtnUserBusinessSvg from "~/assets/figma/qtn-user-business.svg?raw"
import qtnViewSvg from "~/assets/figma/qtn-view.svg?raw"
import {
  buildQuestionSections,
  buildSeverityLabelMap,
  formatQuestionAnswer,
  formatQuestionTitle,
  ImageViewerDialog,
  TableBlock,
  TruncatedText,
  useScrollTabs,
} from "~/components/qtn/qtn-detail"
import { useRequest } from "~/hooks/useRequest"
import {
  getConsultationDetailById,
  type ConsultationDetail,
} from "~/services/app-user-qtn"
import { getBackendOrderDetail } from "~/services/orders"
import { OrderDetailDrawer } from "~/components/order/order-detail-drawer"

const SvgIcon = ({
  svg,
  className,
}: {
  svg: string
  className?: string
}) => <span className={className} dangerouslySetInnerHTML={{ __html: svg }} />

const getText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && !Number.isNaN(value)) return String(value)
  }
  return "-"
}

const getNumber = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "number" && !Number.isNaN(value)) return value
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value)
      if (!Number.isNaN(parsed)) return parsed
    }
  }
  return undefined
}

const formatDateTime = (value?: string | null) => {
  if (!value) return "-"
  const date = dayjs(value)
  return date.isValid() ? date.format("YYYY.MM.DD HH:mm") : "-"
}

const formatMoney = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-"
  return `¥${value}`
}

export type ConsultationDetailDrawerSection = "info" | "questionnaire" | "diagnosis"

export const ConsultationDetailDrawer = ({
  visible,
  consultationId,
  initialSectionKey,
  onClose,
}: {
  visible: boolean
  consultationId?: number
  initialSectionKey?: ConsultationDetailDrawerSection
  onClose: () => void
}) => {
  const { data: detail, loading } = useRequest<ConsultationDetail | null, []>(
    () =>
      visible && consultationId
        ? getConsultationDetailById(consultationId)
        : Promise.resolve(null),
    { refreshDeps: [visible ? consultationId ?? 0 : 0] }
  )

  const consultation = detail?.consultation ?? null
  const qtnMain = detail?.qtnMainVO ?? null

  const statusKey = getText(consultation?.status)
  const statusMeta =
    {
      "0": { label: "待问诊", color: "#E37318", dot: "#E37318" },
      "1": { label: "已完成", color: "#2BA471", dot: "#2BA471" },
      "9": { label: "已取消", color: "#999999", dot: "#999999" },
    }[statusKey] ?? { label: "-", color: "#999999", dot: "#999999" }

  const consultNo = getText(
    consultation?.consultationNo,
    consultation?.consultationNum,
    consultation?.consultationId
  )
  const consultUserName = getText(
    consultation?.userName,
    consultation?.username,
    consultation?.name
  )
  const consultPatient = getText(
    consultation?.patient,
    consultation?.patientName,
    consultation?.userName,
    consultation?.name
  )
  const consultCreateTime = formatDateTime(getText(consultation?.createTime))
  const consultTime = getText(
    consultation?.consultationTime,
    consultation?.qtnTime,
    consultation?.visitTime,
    consultation?.startTime
  )
  const consultDoctor = getText(
    consultation?.doctorName,
    consultation?.doctor,
    consultation?.doctorUserName,
    consultation?.advisorName
  )
  const consultServiceType = getText(
    consultation?.serviceType,
    consultation?.serviceName,
    consultation?.service
  )

  const orderId = getNumber(
    (consultation as unknown as { orderId?: unknown })?.orderId,
    (consultation as unknown as { order_id?: unknown })?.order_id
  )
  const orderNum = getText(
    (consultation as unknown as { orderNum?: unknown })?.orderNum,
    (consultation as unknown as { orderNo?: unknown })?.orderNo,
    (consultation as unknown as { orderNumber?: unknown })?.orderNumber
  )

  const { data: orderDetail } = useRequest(
    () => (visible && orderId ? getBackendOrderDetail(orderId) : Promise.resolve(null)),
    { refreshDeps: [visible ? orderId ?? 0 : 0] }
  )

  const hasOrder = Boolean(orderId || (orderNum && orderNum !== "-"))

  const orderStatus = (orderDetail?.status ?? null) as number | null
  const orderStatusMeta =
    orderStatus === 0
      ? { label: "待支付", dot: "#E37318" }
      : orderStatus === 1
        ? { label: "已支付", dot: "#2BA471" }
        : orderStatus === 2
          ? { label: "已取消", dot: "rgba(0,0,0,0.4)" }
          : orderStatus === 3
            ? { label: "支付中", dot: "#E37318" }
            : { label: "-", dot: "rgba(0,0,0,0.4)" }

  const questionSections = useMemo(() => buildQuestionSections(qtnMain), [qtnMain])
  const severityLabelMap = useMemo(
    () => buildSeverityLabelMap(qtnMain),
    [qtnMain]
  )

  const [imageViewer, setImageViewer] = useState<{
    visible: boolean
    title: string
    images: string[]
    initialIndex: number
  }>({ visible: false, title: "", images: [], initialIndex: 0 })

  const openImages = useCallback(
    (payload: { title: string; images: string[]; initialIndex?: number }) => {
      if (!payload.images.length) return
      setImageViewer({
        visible: true,
        title: payload.title,
        images: payload.images,
        initialIndex: payload.initialIndex ?? 0,
      })
    },
    [setImageViewer]
  )

  const tabs = useMemo(
    () => [
      { key: "info", label: "问诊信息" },
      { key: "questionnaire", label: "患者问卷" },
      { key: "diagnosis", label: "诊断报告" },
    ],
    []
  )
  const { containerRef, setSectionRef, activeKey, scrollTo } = useScrollTabs(
    tabs,
    { lockOnScrollToMs: 1200, hysteresis: 16 }
  )

  const initialScrollMarker = useMemo(() => {
    if (!consultationId || !initialSectionKey) return null
    return `${consultationId}:${initialSectionKey}`
  }, [consultationId, initialSectionKey])
  const initialScrolledMarkerRef = useRef<string | null>(null)

  useEffect(() => {
    if (!visible) return
    if (!initialSectionKey) return
    if (!detail) return
    if (!initialScrollMarker) return
    if (initialScrolledMarkerRef.current === initialScrollMarker) return
    initialScrolledMarkerRef.current = initialScrollMarker

    let raf = 0
    raf = requestAnimationFrame(() => {
      scrollTo(initialSectionKey, "auto")
      requestAnimationFrame(() => scrollTo(initialSectionKey, "auto"))
    })
    return () => {
      if (raf) cancelAnimationFrame(raf)
    }
  }, [detail, initialScrollMarker, initialSectionKey, scrollTo, visible])

  const [orderDrawerVisible, setOrderDrawerVisible] = useState(false)

  const diagnosisAdvisor = getText(consultation?.advisorMsg)
  const diagnosisDoctor = getText(consultation?.doctorMsg)
  const diagnosisAdvice = getText(consultation?.adviceMsg)

  return (
    <>
      <Drawer
        visible={visible}
        placement="right"
        size="760px"
        header={false}
        footer={false}
        closeBtn={false}
        onClose={onClose}
        className="qtn-drawer"
      >
        <div className="flex h-full flex-col bg-white">
          <div className="flex h-14 items-center justify-between border-b border-[#e7e7e7] px-4">
            <div className="text-[16px] font-semibold leading-[24px] text-[rgba(0,0,0,0.9)]">
              问诊管理
            </div>
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded hover:bg-[#f3f3f3]"
              onClick={onClose}
              aria-label="关闭"
            >
              <CloseIcon size={20} />
            </button>
          </div>

          <div className="border-b border-[#e7e7e7] bg-white px-12">
            <div className="flex h-12 items-center gap-6 text-[14px] leading-[22px]">
              {tabs.map((tab) => {
                const isActive = tab.key === activeKey
                const isEnabled = Boolean(detail)
                return (
                  <button
                    key={tab.key}
                    type="button"
                    className={`relative flex h-full items-center ${
                      isActive ? "text-brand" : "text-[rgba(0,0,0,0.6)]"
                    }`}
                    onClick={() => {
                      if (!isEnabled) return
                      scrollTo(tab.key)
                    }}
                  >
                    {tab.label}
                    <span
                      className={`absolute bottom-0 left-0 h-[2px] w-full rounded-full ${
                        isActive ? "bg-brand" : "bg-transparent"
                      }`}
                    />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="min-h-0 flex-1">
            <Loading loading={loading} className="h-full">
              <div
                ref={containerRef}
                className="h-full overflow-y-auto px-12 pb-8 pt-6"
              >
                {!consultationId ? (
                  <div className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                    缺少问诊ID
                  </div>
                ) : !detail ? (
                  <div className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                    暂无问诊详情
                  </div>
                ) : (
                  <div>
                    <div ref={setSectionRef("info")} className="space-y-6">
                      <div className="flex items-center gap-4">
                        <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#ecf9f1]">
                          <SvgIcon svg={qtnInfoSvg} className="inline-flex size-4" />
                        </span>
                        <span className="text-[20px] font-semibold leading-[28px] text-[rgba(0,0,0,0.9)]">
                          问诊信息
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-8">
                        <div className="space-y-6">
                          <div className="flex items-center gap-6">
                            <span className="w-[90px] text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                              问诊编号
                            </span>
                            <TruncatedText
                              value={consultNo}
                              className="block max-w-[240px] truncate text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]"
                            />
                          </div>
                          <div className="flex items-center gap-6">
                            <span className="w-[90px] text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                              用户姓名
                            </span>
                            <span className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                              {consultUserName}
                            </span>
                          </div>
                          <div className="flex items-center gap-6">
                            <span className="w-[90px] text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                              病患姓名
                            </span>
                            <span className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                              {consultPatient}
                            </span>
                          </div>
                          <div className="flex items-center gap-6">
                            <span className="w-[90px] text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                              问诊状态
                            </span>
                            <span className="flex items-center gap-2 text-[14px] leading-[22px]">
                              <span
                                className="inline-flex size-[6px] rounded-full"
                                style={{ backgroundColor: statusMeta.dot }}
                              />
                              <span style={{ color: statusMeta.color }}>
                                {statusMeta.label}
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div className="flex items-center gap-6">
                            <span className="w-[90px] text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                              创建时间
                            </span>
                            <span className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                              {consultCreateTime}
                            </span>
                          </div>
                          <div className="flex items-center gap-6">
                            <span className="w-[90px] text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                              问诊时间
                            </span>
                            <span className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                              {consultTime}
                            </span>
                          </div>
                          <div className="flex items-center gap-6">
                            <span className="w-[90px] text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                              问诊医生
                            </span>
                            <span className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                              {consultDoctor}
                            </span>
                          </div>
                          <div className="flex items-center gap-6">
                            <span className="w-[90px] text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                              服务类型
                            </span>
                            <span className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                              {consultServiceType}
                            </span>
                          </div>
                        </div>
                      </div>

                      {hasOrder ? (
                        <div className="rounded border border-[#e7e7e7] bg-white p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#ecf9f1]">
                                <SvgIcon svg={qtnViewSvg} className="inline-flex size-4" />
                              </span>
                              <div className="text-[16px] font-semibold leading-[24px] text-[rgba(0,0,0,0.9)]">
                                关联订单
                              </div>
                            </div>
                            <Button
                              theme="primary"
                              variant="outline"
                              onClick={() => setOrderDrawerVisible(true)}
                            >
                              查看订单
                            </Button>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-4">
                            <div className="flex items-center gap-6">
                              <span className="w-[90px] text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                                订单编号
                              </span>
                              <TruncatedText
                                value={getText(orderDetail?.orderNum, orderNum)}
                                className="block max-w-[240px] truncate text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]"
                              />
                            </div>
                            <div className="flex items-center gap-6">
                              <span className="w-[90px] text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                                订单状态
                              </span>
                              <span className="flex items-center gap-2 text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                                <span
                                  className="inline-flex size-[6px] rounded-full"
                                  style={{ backgroundColor: orderStatusMeta.dot }}
                                />
                                {orderStatusMeta.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-6">
                              <span className="w-[90px] text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                                支付金额
                              </span>
                              <span className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                                {formatMoney(orderDetail?.price ?? null)}
                              </span>
                            </div>
                            <div className="flex items-center gap-6">
                              <span className="w-[90px] text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                                套餐名称
                              </span>
                              <TruncatedText
                                value={getText(orderDetail?.packageName, orderDetail?.pkgName)}
                                className="block max-w-[240px] truncate text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]"
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div ref={setSectionRef("questionnaire")} className="mt-8 space-y-4">
                      <div className="flex items-center gap-4">
                        <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#ecf9f1]">
                          <SvgIcon
                            svg={qtnUserBusinessSvg}
                            className="inline-flex size-4"
                          />
                        </span>
                        <span className="text-[20px] leading-[28px] text-[rgba(0,0,0,0.9)]">
                          患者问卷
                        </span>
                      </div>

                      {questionSections.length ? (
                        questionSections.map((section) => {
                          if (!section.questions.length) return null
                          const headers = section.questions.map((question) =>
                            formatQuestionTitle(question)
                          )
                          const row = section.questions.map((question) =>
                            formatQuestionAnswer(question, {
                              severityLabelMap,
                              onOpenImages: openImages,
                            })
                          )
                          return (
                            <TableBlock
                              key={`${section.key}-${headers.length}`}
                              headers={headers}
                              rows={[row]}
                            />
                          )
                        })
                      ) : (
                        <div className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                          暂无问卷数据
                        </div>
                      )}
                    </div>

                    <div ref={setSectionRef("diagnosis")} className="mt-8 space-y-4">
                      <div className="flex items-center gap-2 text-[14px] font-semibold leading-[22px] text-[#267347]">
                        <span className="inline-flex size-6 items-center justify-center rounded-full bg-[#ecf9f1] text-[12px] font-semibold text-[#267347]">
                          ✓
                        </span>
                        诊断报告
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-2">
                          <div className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                            健康顾问备注
                          </div>
                          <Textarea
                            value={diagnosisAdvisor}
                            readonly
                            autosize={{ minRows: 3, maxRows: 6 }}
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                            医生诊断
                          </div>
                          <Textarea
                            value={diagnosisDoctor}
                            readonly
                            autosize={{ minRows: 3, maxRows: 6 }}
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                            治疗建议
                          </div>
                          <Textarea
                            value={diagnosisAdvice}
                            readonly
                            autosize={{ minRows: 3, maxRows: 6 }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Loading>
          </div>
        </div>
      </Drawer>

      <ImageViewerDialog
        visible={imageViewer.visible}
        title={imageViewer.title}
        images={imageViewer.images}
        initialIndex={imageViewer.initialIndex}
        onClose={() =>
          setImageViewer((prev) => ({
            ...prev,
            visible: false,
          }))
        }
      />

      <OrderDetailDrawer
        visible={orderDrawerVisible}
        orderId={orderId}
        orderNum={orderNum === "-" ? undefined : orderNum}
        onClose={() => setOrderDrawerVisible(false)}
      />
    </>
  )
}
