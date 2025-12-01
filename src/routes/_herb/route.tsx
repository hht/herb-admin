import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
  useRouter,
} from "@tanstack/react-router"
import { useEffect } from "react"

import { cn } from "~/libs/utils"
import { useHerbStore } from "~/hooks/useStore"

const MENU_GROUPS = [
  {
    label: "问诊",
    items: [
      { label: "聊天室", to: "/dashboard" },
      { label: "订单管理", disabled: true },
      { label: "预约管理", disabled: true },
      { label: "用户管理", disabled: true },
      { label: "药材管理", disabled: true },
    ],
  },
  {
    label: "管理员",
    items: [{ label: "员工管理", to: "/employees" }],
  },
  {
    label: "更多",
    items: [{ label: "个人页", disabled: true }],
  },
]

const AccountDetector = () => {
  const router = useRouter()
  const accessToken = useHerbStore((state) => state.accessToken)
  useEffect(() => {
    if (!accessToken) {
      router.history.replace("/auth")
    }
  }, [accessToken, router])
  return null
}

const HerbLayout = () => {
  const navigate = useNavigate()
  const routerState = useRouterState()
  const accessToken = useHerbStore((state) => state.accessToken)
  const resetSession = useHerbStore((state) => state.resetSession)
  const activePath = routerState.location.pathname

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 w-screen">
      <aside className="hidden w-64 flex-shrink-0 border-r border-slate-100 bg-white lg:flex lg:flex-col">
        <div className="flex items-center gap-3 px-6 py-6 text-[#0052d9]">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#0052d9] font-semibold">
            T
          </div>
          <div className="text-xl font-semibold">Change Name</div>
        </div>
        <div className="flex-1 space-y-6 px-4 pb-8">
          {MENU_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                {group.label}
              </p>
              <nav className="mt-2 grid gap-1">
                {group.items.map((item) => {
                  const isActive = item.to && activePath === item.to
                  return (
                    <button
                      key={item.label}
                      type="button"
                      disabled={item.disabled}
                      onClick={() => item.to && navigate({ to: item.to })}
                      className={cn(
                        "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm",
                        item.disabled && "cursor-not-allowed text-slate-400",
                        isActive
                          ? "bg-[#eef4ff] font-semibold text-[#0052d9]"
                          : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </nav>
            </div>
          ))}
        </div>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col min-w-0">
        <header className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4 w-full">
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <Link className="text-slate-600" to="/dashboard">
              控制台
            </Link>
            <span>/</span>
            <span className="text-slate-400">
              {activePath === "/employees" ? "员工管理" : "仪表盘"}
            </span>
          </div>
          {accessToken ? (
            <button
              type="button"
              className="text-sm text-slate-500 hover:text-slate-900"
              onClick={resetSession}
            >
              退出登录
            </button>
          ) : null}
        </header>
        <main className="flex flex-1 w-full flex-col min-w-0">
          <section className="flex-1 overflow-y-auto p-6 min-w-0">
            <Outlet />
          </section>
        </main>
      </div>
      <AccountDetector />
    </div>
  )
}

export const Route = createFileRoute("/_herb")({
  beforeLoad: async () => {
    if (!useHerbStore.getState().accessToken) {
      throw redirect({
        to: "/auth",
        search: {
          redirect: location.href,
        },
      })
    }
  },
  component: HerbLayout,
})
