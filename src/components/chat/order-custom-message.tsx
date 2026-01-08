import { useState, type CSSProperties } from "react"
import { DialogPlugin, MessagePlugin } from "tdesign-react"
import { BaseMessage, type BaseMessageProps } from "easemob-chat-uikit"

import { OrderDetailDrawer } from "~/components/order/order-detail-drawer"
import { cancelBackendOrder } from "~/services/orders"
import { useRequest } from "~/hooks/useRequest"

type CustomMessageLike = NonNullable<BaseMessageProps["message"]> & {
  type?: string
  ext?: unknown
  customEvent?: unknown
}

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {}

const getString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return undefined
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

const getOrderStatusLabel = (value?: number) => {
  if (value === 0) return "待支付"
  if (value === 1) return "已支付"
  if (value === 2) return "已取消"
  if (value === 3) return "支付中"
  if (value === 9) return "已取消"
  return `状态${value}`
}

const getOrderDescription = (value?: number) => {
  if (value === 0) return "已创建套餐，等待用户支付套餐"
  if (value === 1) return "用户已支付套餐"
  if (value === 2) return "订单已取消"
  if (value === 3) return "订单支付中"
  if (value === 9) return "订单已取消"
  return "订单状态更新中"
}

export const OrderCustomMessage = ({
  message,
  messageProps,
  style,
}: {
  message: CustomMessageLike
  messageProps?: BaseMessageProps
  style?: CSSProperties
}) => {
  const ext = toRecord(message.ext)
  const title = getString(ext.title) ?? "创建订单"
  const orderNum = getString(ext.orderNum)
  const orderId = getNumber(ext.orderId)
  const statusFromExt = getNumber(ext.status)

  const [detailVisible, setDetailVisible] = useState(false)
  const [detailNonce, setDetailNonce] = useState(0)
  const status = getNumber(statusFromExt)
  const statusLabel = getOrderStatusLabel(status)
  const description = getOrderDescription(status)

  const { runAsync: runCancel, loading: cancelling } = useRequest(
    async () => {
      if (!orderId) {
        throw new Error("缺少订单ID")
      }
      return await cancelBackendOrder(orderId)
    },
    { manual: true }
  )

  const confirmCancel = () => {
    const dialog = DialogPlugin.confirm({
      header: "取消订单",
      body: "确认取消该订单吗？",
      confirmBtn: { content: "确定", loading: cancelling },
      cancelBtn: "取消",
      onConfirm: async () => {
        await runCancel()
        MessagePlugin.success("订单已取消")
        dialog.hide()
        setDetailNonce((prev) => prev + 1)
      },
      onCancel: () => dialog.hide(),
      onClose: () => dialog.hide(),
    })
  }

  return (
    <div style={style} className="inline-flex">
      <BaseMessage
        {...(messageProps ?? {})}
        message={message}
        arrow={false}
        bubbleType="primary"
        onClick={() => false}
        bubbleStyle={{
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          padding: 0,
          maxWidth: 'none',
          width: 'fit-content',
          display: 'inline-block',
        }}
      >
        <div
          className="inline-block w-[248px] rounded-[4px] border border-[#2BA471] bg-white px-4 py-3"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex size-4 items-center justify-center rounded bg-[#2BA471] text-[12px] leading-[16px] text-white">
              ¥
            </span>
            <span className="text-[14px] font-semibold leading-[22px] text-[rgba(0,0,0,0.9)]">
              {statusLabel || title}
            </span>
          </div>
          <div className="mt-2 text-[12px] leading-[20px] text-[rgba(0,0,0,0.6)]">
            {description}
          </div>
          {orderNum ? (
            <div className="mt-1 text-[12px] leading-[20px] text-[rgba(0,0,0,0.4)]">
              订单号：{orderNum}
            </div>
          ) : null}
          <div className="mt-3 flex items-center justify-between text-[12px] leading-[20px]">
            <button
              type="button"
              className="text-[#267347]"
              onClick={(event) => {
                event.stopPropagation()
                setDetailVisible(true)
              }}
            >
              查看详情
            </button>
            <button
              type="button"
              className="text-[rgba(0,0,0,0.6)]"
              onClick={(event) => {
                event.stopPropagation()
                if (!orderId) {
                  MessagePlugin.warning("缺少订单ID，无法取消")
                  return
                }
                confirmCancel()
              }}
              disabled={!orderId || status === 2 || status === 9}
            >
              取消
            </button>
          </div>
        </div>
      </BaseMessage>

      <OrderDetailDrawer
        visible={detailVisible}
        orderId={orderId}
        orderNum={orderNum}
        refreshToken={detailNonce}
        onClose={() => setDetailVisible(false)}
      />
    </div>
  )
}
