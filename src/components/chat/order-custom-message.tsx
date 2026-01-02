import { useMemo, useState, type CSSProperties } from 'react'
import { Button, Drawer, Input, Loading, MessagePlugin, Textarea } from 'tdesign-react'
import { CloseIcon } from 'tdesign-icons-react'
import { BaseMessage, type BaseMessageProps } from 'easemob-chat-uikit'

import { getAppOrderDetail, type Order } from '~/services/orders'
import { useRequest } from '~/hooks/useRequest'

type CustomMessageLike = NonNullable<BaseMessageProps['message']> & {
  type?: string
  ext?: unknown
  customEvent?: unknown
}

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

const getString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

const getNumber = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'number' && !Number.isNaN(value)) return value
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value)
      if (!Number.isNaN(parsed)) return parsed
    }
  }
  return undefined
}

const formatPrice = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '-'
  return `${value}`
}

const getOrderStatusLabel = (value?: number) => {
  if (!value) return ''
  if (value === 1) return '订单待支付'
  if (value === 2) return '已支付'
  if (value === 3) return '已完成'
  if (value === 9) return '已取消'
  return `状态${value}`
}

const getOrderDescription = (value?: number) => {
  if (value === 1) return '已创建套餐，等待用户支付套餐'
  if (value === 2) return '用户已支付套餐'
  if (value === 3) return '订单已完成'
  if (value === 9) return '订单已取消'
  return '订单状态更新中'
}

const getPayStatusLabel = (value?: number) => {
  if (value === 1) return '未支付'
  if (value === 2) return '已支付'
  return '-'
}

export const isOrderCustomMessage = (message: CustomMessageLike) => {
  if (!message || message.type !== 'custom') return false
  const ext = toRecord(message.ext)
  const orderNum = getString(ext.orderNum)
  const orderId = getNumber(ext.orderId)
  const title = getString(ext.title, message.customEvent)
  if (orderNum || orderId) return true
  return Boolean(title && title.includes('订单'))
}

const OrderDetailDrawer = ({
  visible,
  orderId,
  orderNum,
  onClose,
}: {
  visible: boolean
  orderId?: number
  orderNum?: string
  onClose: () => void
}) => {
  const query = useMemo(() => {
    if (!visible) return undefined
    if (orderId) return { orderId }
    if (orderNum) return { orderNum }
    return undefined
  }, [orderId, orderNum, visible])
  const { data: order, loading } = useRequest(
    () => (query ? getAppOrderDetail(query) : Promise.resolve(null)),
    { refreshDeps: [query ? JSON.stringify(query) : ''] }
  )
  const payStatusLabel = getPayStatusLabel(getNumber(order?.status))

  const contents =
    order?.contents?.length && order.contents.some((item) => item?.name || item?.content)
      ? order.contents
      : []

  return (
    <Drawer
      visible={visible}
      placement="right"
      size="760px"
      header={false}
      footer={false}
      closeBtn={false}
      onClose={onClose}
      className="order-detail-drawer"
    >
      <div className="flex h-full flex-col bg-white">
        <div className="flex items-center justify-between border-b border-[#e7e7e7] px-6 py-4">
          <div className="text-[16px] font-semibold leading-[24px] text-[rgba(0,0,0,0.9)]">
            创建订单
          </div>
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded hover:bg-[#f3f3f3]"
            onClick={onClose}
            aria-label="关闭"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
          <Loading loading={loading}>
            <div className="space-y-6">
              <div className="space-y-4 text-[14px] leading-[22px]">
                <div className="grid grid-cols-[90px_1fr] gap-y-4">
                  <div className="text-[rgba(0,0,0,0.4)]">订单编号</div>
                  <div className="text-[rgba(0,0,0,0.9)]">
                    {order?.orderNum ?? orderNum ?? '-'}
                  </div>
                  <div className="text-[rgba(0,0,0,0.4)]">病患姓名</div>
                  <div className="text-[rgba(0,0,0,0.9)]">
                    {order?.userName ?? '-'}
                  </div>
                  <div className="text-[rgba(0,0,0,0.4)]">问诊医生</div>
                  <div className="text-[rgba(0,0,0,0.9)]">-</div>
                  <div className="text-[rgba(0,0,0,0.4)]">支付状态</div>
                  <div className="text-[rgba(0,0,0,0.9)]">{payStatusLabel}</div>
                </div>
              </div>

              <div className="border-t border-[#e7e7e7]" />

              <div className="space-y-2">
                <div className="flex items-center gap-0.5 text-[14px] leading-[22px]">
                  <span className="text-[rgba(0,0,0,0.4)]">选择病种</span>
                </div>
                <Input
                  readonly
                  value={order?.disease ?? '-'}
                  placeholder="-"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-0.5 text-[14px] leading-[22px]">
                  <span className="text-[rgba(0,0,0,0.4)]">套餐名</span>
                </div>
                <Input
                  readonly
                  value={order?.packageName ?? '-'}
                  placeholder="-"
                />
              </div>

              <div className="space-y-4">
                {(contents.length ? contents : [{ name: '', content: '' }]).map(
                  (item, index) => {
                    const isFirst = index === 0
                    const title = isFirst
                      ? '服务一'
                      : `服务${index + 1}（选填）`
                    return (
                      <div key={`${item.name ?? item.title ?? ''}-${index}`} className="space-y-2">
                        <div className="flex items-center gap-0.5 text-[14px] leading-[22px]">
                          <span className="text-[rgba(0,0,0,0.4)]">{title}</span>
                        </div>
                        <Input
                          readonly
                          value={item.name ?? item.title ?? '-'}
                          placeholder="-"
                        />
                        <Textarea
                          readonly
                          autosize={{ minRows: 3, maxRows: 6 }}
                          value={item.content ?? '-'}
                          placeholder="-"
                        />
                      </div>
                    )
                  }
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-0.5 text-[14px] leading-[22px]">
                    <span className="text-[rgba(0,0,0,0.4)]">套餐现价</span>
                  </div>
                  <Input
                    readonly
                    value={order?.price === null || typeof order?.price === 'undefined' ? '-' : String(order.price)}
                    suffix="人民币"
                    placeholder="-"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-0.5 text-[14px] leading-[22px]">
                    <span className="text-[rgba(0,0,0,0.4)]">套餐原价（选填）</span>
                  </div>
                  <Input
                    readonly
                    value={
                      order?.originalPrice === null || typeof order?.originalPrice === 'undefined'
                        ? '-'
                        : String(order.originalPrice)
                    }
                    suffix="人民币"
                    placeholder="-"
                  />
                </div>
              </div>
            </div>
          </Loading>
        </div>

        <div className="border-t border-[#e7e7e7] bg-white px-6 py-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              关闭
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  )
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
  const title = getString(ext.title) ?? '创建订单'
  const orderNum = getString(ext.orderNum)
  const orderId = getNumber(ext.orderId)
  const statusFromExt = getNumber(ext.status)

  const [detailVisible, setDetailVisible] = useState(false)
  const status = getNumber(statusFromExt)
  const statusLabel = getOrderStatusLabel(status)
  const description = getOrderDescription(status)

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
                MessagePlugin.info('暂无取消订单接口')
              }}
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
        onClose={() => setDetailVisible(false)}
      />
    </div>
  )
}
