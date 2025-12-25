import { CloseIcon } from "tdesign-icons-react"
import type { FC } from "react"

export type SidebarTab =
  | "questionnaire"
  | "orders"
  | "appointments"
  | "appointment-records"
  | "add-advisor"
  | "patient-info"
  | "terminate"

interface ChatSidebarProps {
  activeTab: SidebarTab | null
  onClose: () => void
}

const tabTitles: Record<SidebarTab, string> = {
  questionnaire: "问卷",
  orders: "订单记录",
  appointments: "预约问诊/回诊",
  "appointment-records": "预约记录",
  "add-advisor": "添加健康顾问/医生",
  "patient-info": "病人信息",
  terminate: "终止/回绝",
}

const QuestionnaireContent = () => {
  return (
    <div className="space-y-3 p-4">
      {/* 示例问卷卡片 */}
      <div className="rounded border border-border bg-neutral-special-light p-3">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-950/90">
                病患名称+创建时间（名称）
              </span>
            </div>
            <div className="text-xs text-neutral-950/40">更新时间</div>
          </div>
        </div>
        <div className="mb-2 text-xs text-neutral-600">
          是否为自己已的问卷
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded bg-white px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-950/5"
          >
            查看详情/修改
          </button>
          <button
            type="button"
            className="rounded bg-primary px-4 py-1.5 text-xs text-white hover:bg-primary-600"
          >
            发送
          </button>
        </div>
      </div>

      <div className="rounded border border-border bg-neutral-special-light p-3">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-950/90">
                病患名称+创建时间（名称）
              </span>
            </div>
            <div className="text-xs text-neutral-950/40">更新时间</div>
          </div>
        </div>
        <div className="mb-2 text-xs text-neutral-600">
          是否为自己已的问卷
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded bg-white px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-950/5"
          >
            查看详情/修改
          </button>
          <button
            type="button"
            className="rounded bg-primary px-4 py-1.5 text-xs text-white hover:bg-primary-600"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  )
}

const OrdersContent = () => {
  return (
    <div className="p-4">
      <div className="text-center text-sm text-neutral-950/40">暂无订单记录</div>
    </div>
  )
}

const AppointmentsContent = () => {
  return (
    <div className="p-4">
      <div className="text-center text-sm text-neutral-950/40">暂无预约问诊</div>
    </div>
  )
}

const AppointmentRecordsContent = () => {
  return (
    <div className="p-4">
      <div className="text-center text-sm text-neutral-950/40">暂无预约记录</div>
    </div>
  )
}

const AddAdvisorContent = () => {
  return (
    <div className="p-4">
      <div className="text-center text-sm text-neutral-950/40">添加健康顾问功能开发中</div>
    </div>
  )
}

const PatientInfoContent = () => {
  return (
    <div className="p-4">
      <div className="text-center text-sm text-neutral-950/40">暂无病人信息</div>
    </div>
  )
}

const TerminateContent = () => {
  return (
    <div className="p-4">
      <div className="text-center text-sm text-neutral-950/40">终止/回绝功能开发中</div>
    </div>
  )
}

const sidebarContent: Record<SidebarTab, FC> = {
  questionnaire: QuestionnaireContent,
  orders: OrdersContent,
  appointments: AppointmentsContent,
  "appointment-records": AppointmentRecordsContent,
  "add-advisor": AddAdvisorContent,
  "patient-info": PatientInfoContent,
  terminate: TerminateContent,
}

export const ChatSidebar: FC<ChatSidebarProps> = ({ activeTab, onClose }) => {
  if (!activeTab) return null

  const ContentComponent = sidebarContent[activeTab]

  return (
    <div className="flex h-full w-[358px] flex-shrink-0 flex-col border-l border-border bg-white">
      {/* 侧边栏头部 */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <h3 className="text-base font-medium text-neutral-950/90">
          {tabTitles[activeTab]}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="flex size-6 items-center justify-center rounded hover:bg-neutral-950/5"
        >
          <CloseIcon size={16} className="text-neutral-600" />
        </button>
      </div>

      {/* 侧边栏内容 */}
      <div className="flex-1 overflow-y-auto bg-neutral-50">
        <ContentComponent />
      </div>
    </div>
  )
}
