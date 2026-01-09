import dayjs from "dayjs"
import { CloseIcon } from "tdesign-icons-react"
import { Loading } from "tdesign-react"

import type { ReactNode } from "react"

import orderFileSvg from "~/assets/figma/order/file-1-filled.svg?raw"
import userBusinessSvg from "~/assets/figma/order/user-business-filled.svg?raw"
import undertakeHoldUpSvg from "~/assets/figma/order/undertake-hold-up-filled.svg?raw"
import { cn } from "~/libs/utils"
import type { Order } from "~/services/orders"

const SvgIcon = ({
  svg,
  className,
}: {
  svg: string
  className?: string
}) => <span className={className} dangerouslySetInnerHTML={{ __html: svg }} />

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {}

const getText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && !Number.isNaN(value)) return String(value)
  }
  return "-"
}

const formatDateTime = (value?: string | null) => {
  if (!value) return "-"
  const date = dayjs(value)
  return date.isValid() ? date.format("YYYY/MM/DD HH:mm") : "-"
}

const formatMoney = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-"
  return `¥${value}`
}

const getOrderStatusMeta = (value?: number | null) => {
  // 后台：0待支付 1已支付 2已取消 3支付中
  if (value === 0) return { label: "待支付", dot: "#E37318", color: "#E37318" }
  // 设计稿：已完成
  if (value === 1) return { label: "已完成", dot: "#2BA471", color: "#2BA471" }
  if (value === 2) return { label: "已取消", dot: "#999999", color: "#999999" }
  if (value === 3) return { label: "支付中", dot: "#E37318", color: "#E37318" }
  // 兼容旧状态
  if (value === 9) return { label: "已取消", dot: "#999999", color: "#999999" }
  return { label: "-", dot: "#999999", color: "#999999" }
}

const SectionTitle = ({
  iconSvg,
  title,
}: {
  iconSvg: string
  title: string
}) => {
  return (
    <div className="flex items-center gap-4">
      <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#ecf9f1] text-[#267347]">
        <SvgIcon svg={iconSvg} className="inline-flex size-4" />
      </span>
      <span className="text-[20px] font-semibold leading-[28px] text-[rgba(0,0,0,0.9)]">
        {title}
      </span>
    </div>
  )
}

const InfoRow = ({
  label,
  labelWidthClassName,
  children,
}: {
  label: string
  labelWidthClassName?: string
  children: ReactNode
}) => {
  return (
    <div className="flex items-center gap-6">
      <span
        className={cn(
          "shrink-0 text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]",
          labelWidthClassName ?? "w-[91px]"
        )}
      >
        {label}
      </span>
      <div className="min-w-0 text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
        {children}
      </div>
    </div>
  )
}

const buildServiceLabel = (value: unknown, index: number) => {
  const text = typeof value === "string" ? value.trim() : ""
  if (text) return text
  const cnNumber =
    ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"][index] ??
    `${index + 1}`
  return `服务${cnNumber}`
}

const resolveDoctorName = (order: Order | null) => {
  const record = toRecord(order)
  return getText(
    record.doctorName,
    record.doctorNickName,
    record.doctor,
    record.doctorUserName,
    record.doctorUsername
  )
}

const resolvePatientName = (order: Order | null) => {
  const record = toRecord(order)
  return getText(record.patientName, record.patient, record.patientNickName)
}

const resolveShippingInfo = (order: Order | null) => {
  const record = toRecord(order)

  const province = getText(record.province, record.receiverProvince)
  const city = getText(record.city, record.receiverCity)
  const district = getText(record.district, record.receiverDistrict)
  const street = getText(record.street, record.receiverStreet)

  const detailAddress = getText(
    record.detailAddress,
    record.addressDetail,
    record.address,
    record.receiverAddress,
    record.shippingAddress,
    record.receiveAddress
  )

  const receiverName = getText(
    record.receiverName,
    record.receiveName,
    record.consignee,
    record.contactName,
    record.userName
  )
  const receiverPhone = getText(
    record.receiverPhone,
    record.receivePhone,
    record.phone,
    record.mobile,
    record.phonenumber
  )

  const region = [province, city, district, street].filter((item) => item !== "-")

  return { region, detailAddress, receiverName, receiverPhone }
}

export const OrderDetailContent = ({
  loading,
  error,
  order,
  onClose,
}: {
  loading: boolean
  error?: unknown
  order: Order | null
  onClose: () => void
}) => {
  const record = toRecord(order)
  const statusMeta = getOrderStatusMeta(order?.status ?? undefined)
  const doctorDiagnosis = getText(record.doctorMsg, record.doctorDiagnosis, record.diagnosis)

  const { region, detailAddress, receiverName, receiverPhone } =
    resolveShippingInfo(order ?? null)

  const serviceItems = (order?.contents ?? []).map((item, index) => ({
    label: buildServiceLabel(item.title, index),
    name: getText(item.name),
    content: getText(item.content),
  }))

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-[#e7e7e7] px-4">
        <div className="text-[16px] font-semibold leading-[24px] text-[rgba(0,0,0,0.9)]">
          订单管理
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

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {error ? (
          <div className="flex h-full items-center justify-center px-12 text-[14px] leading-[22px] text-[rgba(0,0,0,0.6)]">
            {error instanceof Error ? error.message : "加载失败，请稍后重试"}
          </div>
        ) : (
          <Loading loading={loading} className="h-full">
            <div className="h-full overflow-y-auto px-12 pb-12 pt-24">
              <div className="space-y-8">
              {/* 订单信息 */}
              <section>
                <SectionTitle iconSvg={orderFileSvg} title="订单信息" />
                <div className="mt-6 grid grid-cols-2 gap-x-8">
                  <div className="space-y-6">
                    <InfoRow label="订单编号">{getText(order?.orderNum)}</InfoRow>
                    <InfoRow label="用户姓名">
                      {getText(order?.userName, record.username)}
                    </InfoRow>
                    <InfoRow label="病患姓名">
                      {resolvePatientName(order ?? null)}
                    </InfoRow>
                    <InfoRow label="订单状态">
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-flex size-[6px] rounded-full"
                          style={{ backgroundColor: statusMeta.dot }}
                        />
                        <span style={{ color: statusMeta.color }}>
                          {statusMeta.label}
                        </span>
                      </span>
                    </InfoRow>
                  </div>
                  <div className="space-y-6">
                    <InfoRow label="创建时间" labelWidthClassName="w-[120px]">
                      {formatDateTime(order?.createTime ?? null)}
                    </InfoRow>
                    <InfoRow label="问诊医生" labelWidthClassName="w-[120px]">
                      {resolveDoctorName(order ?? null)}
                    </InfoRow>
                    <InfoRow label="病种类型" labelWidthClassName="w-[120px]">
                      {getText(order?.disease, record.diseaseName)}
                    </InfoRow>
                    <InfoRow label="订单金额" labelWidthClassName="w-[120px]">
                      {formatMoney(order?.price ?? null)}
                    </InfoRow>
                  </div>
                </div>
              </section>

              {/* 收货地址 */}
              <section>
                <SectionTitle iconSvg={userBusinessSvg} title="收货地址" />
                <div className="mt-6 space-y-2 text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)]">
                  <div className="flex flex-wrap items-center gap-x-1">
                    {region.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                    {detailAddress !== "-" ? <span>{detailAddress}</span> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{receiverName}</span>
                    <span>{receiverPhone}</span>
                  </div>
                </div>
              </section>

              {/* 医生诊断 */}
              <section>
                <SectionTitle iconSvg={userBusinessSvg} title="医生诊断" />
                <div className="mt-6 space-y-4">
                  <div className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                    医生诊断
                  </div>
                  <div className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.9)] whitespace-pre-wrap">
                    {doctorDiagnosis}
                  </div>
                </div>
              </section>

              {/* 服务内容 */}
              <section>
                <SectionTitle iconSvg={undertakeHoldUpSvg} title="服务内容" />
                <div className="mt-6 space-y-8">
                  <div className="space-y-2">
                    <div className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                      套餐名
                    </div>
                    <div className="text-[14px] font-semibold leading-[22px] text-[rgba(0,0,0,0.9)]">
                      {getText(order?.packageName, record.pkgName)}
                    </div>
                  </div>

                  {serviceItems.length ? (
                    serviceItems.map((service) => (
                      <div
                        key={`${service.label}-${service.name}`}
                        className="space-y-2"
                      >
                        <div className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                          {service.label}
                        </div>
                        <div className="space-y-2">
                          <div className="text-[14px] font-semibold leading-[22px] text-[rgba(0,0,0,0.9)]">
                            {service.name}
                          </div>
                          <div className="text-[12px] leading-[20px] text-[rgba(0,0,0,0.6)] whitespace-pre-wrap">
                            {service.content}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                      暂无服务内容
                    </div>
                  )}
                </div>
              </section>
            </div>
            </div>
          </Loading>
        )}
      </div>
    </div>
  )
}
