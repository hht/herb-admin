import {
  createFileRoute,
  Outlet,
  redirect,
  useRouter,
} from "@tanstack/react-router"
import { useEffect } from "react"
import { SettingIcon, UserCircleIcon } from "tdesign-icons-react"

import { useHerbStore } from "~/hooks/useStore"
import { Navigator } from "~/widgets/navigator"
import { Provider } from "~/widgets/provider"

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
  const resetSession = useHerbStore((state) => state.resetSession)

  return (
    <Provider>
      <div className="flex h-screen w-screen overflow-hidden bg-neutral-100">
        {/* 左侧导航栏 */}
        <Navigator />

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* 顶部导航栏 */}
          <header className="flex h-14 items-center justify-between border-b border-border bg-white px-6">
            <div className="flex items-center gap-4">
              <div className="flex cursor-pointer items-center gap-2 px-2 py-1">
                <UserCircleIcon className="text-neutral-950/90" size={20} />
                <span className="text-sm text-neutral-950/90">用户名</span>
              </div>
              <button
                type="button"
                className="rounded p-1.5 hover:bg-neutral-950/5"
                onClick={resetSession}
              >
                <SettingIcon className="text-neutral-950/90" size={20} />
              </button>
            </div>
          </header>

          {/* 主内容区 */}
          <main className="flex flex-1 overflow-hidden">
            <Outlet />
          </main>
        </div>
        <AccountDetector />
      </div>
    </Provider>
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
