import { useMemo } from "react"
import { Drawer } from "tdesign-react"

import { OrderDetailContent } from "~/components/order/order-detail-content"
import { useRequest } from "~/hooks/useRequest"
import {
  getAppOrderDetail,
  getBackendOrderDetail,
  type OrderDetailQuery,
} from "~/services/orders"

export const OrderDetailDrawer = ({
  visible,
  orderId,
  orderNum,
  refreshToken,
  onClose,
}: {
  visible: boolean
  orderId?: number
  orderNum?: string
  refreshToken?: string | number
  onClose: () => void
}) => {
  const query = useMemo<OrderDetailQuery | undefined>(() => {
    if (!visible) return undefined
    if (orderId) return { orderId }
    if (orderNum) return { orderNum }
    return undefined
  }, [orderId, orderNum, visible])

  const queryKey = query ? JSON.stringify(query) : ""
  const refreshKey = String(refreshToken ?? "")

  const { data: order, loading } = useRequest(
    async () => {
      if (!query) return null
      if (query.orderId) return await getBackendOrderDetail(query.orderId)
      return await getAppOrderDetail(query)
    },
    { refreshDeps: [queryKey, refreshKey] }
  )

  return (
    <Drawer
      visible={visible}
      placement="right"
      size="760px"
      header={false}
      footer={false}
      closeBtn={false}
      onClose={onClose}
      className="order-drawer"
    >
      <OrderDetailContent
        loading={loading}
        order={order ?? null}
        onClose={onClose}
      />
    </Drawer>
  )
}
