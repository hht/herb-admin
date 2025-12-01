import { createFileRoute } from "@tanstack/react-router"
import { Card, Tag } from "tdesign-react"

export const Route = createFileRoute("/_herb/dashboard")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white px-6 py-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800">欢迎回来</h2>
        <p className="mt-2 text-sm text-slate-500">
          请选择左侧菜单继续。可从员工管理进入人员信息维护。
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[{ label: "今日预约", value: "128" }, { label: "待问诊", value: "36" }, { label: "药材预警", value: "5" }].map((item) => (
          <Card key={item.label} bordered={false} className="rounded-xl shadow-sm">
            <div className="space-y-1">
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="text-3xl font-semibold text-slate-900">{item.value}</p>
              <Tag theme="success" variant="light-outline">
                实时数据
              </Tag>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
