import {
  createFileRoute,
  Outlet,
  redirect,
  useRouter,
} from "@tanstack/react-router"
import { useEffect } from "react"

import { useHerbStore } from "~/hooks/useStore"

export const AccountDetector = () => {
  const router = useRouter()
  const accessToken = useHerbStore((state) => state.accessToken)
  useEffect(() => {
    if (!accessToken) {
      router.history.replace("/auth")
    }
  }, [accessToken, router])
  return null
}

function Page() {
  return (
    <>
      <Outlet />
      <AccountDetector />
    </>
  )
}

export const Route = createFileRoute("/_herb")({
  beforeLoad: async () => {
    console.log("beforeLoad _herb")
    if (!useHerbStore.getState().accessToken) {
      throw redirect({
        to: "/auth",
        search: {
          redirect: location.href,
        },
      })
    }
  },
  component: Page,
})
