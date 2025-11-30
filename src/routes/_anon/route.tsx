import {
  createFileRoute,
  Outlet,
  redirect,
  useRouter,
} from "@tanstack/react-router"
import { useEffect } from "react"
import { Screen } from "~/components"
import { useHerbStore } from "~/hooks/useStore"

const AccountDetector = () => {
  const router = useRouter()
  const accessToken = useHerbStore((state) => state.accessToken)
  useEffect(() => {
    if (accessToken) {
      router.history.replace("/dashboard")
    }
  }, [accessToken, router])
  return null
}

function Page() {
  return (
    <Screen className="bg-background">
      <Outlet />
      <AccountDetector />
    </Screen>
  )
}
export const Route = createFileRoute("/_anon")({
  beforeLoad: () => {
    if (useHerbStore.getState().accessToken) {
      throw redirect({ to: "/dashboard" })
    }
  },
  component: Page,
})
