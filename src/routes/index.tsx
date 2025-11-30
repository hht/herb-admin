import { createFileRoute, redirect } from "@tanstack/react-router"
import { useHerbStore } from "~/hooks/useStore"

function Page() {
  return null
}

export const Route = createFileRoute("/")({
  component: Page,
  beforeLoad: async () => {
    if (!useHerbStore.getState().accessToken) {
      throw redirect({
        to: "/auth",
        search: {
          redirect: location.href,
        },
      })
    } else {
      if (location.pathname === "/") {
        throw redirect({ to: "/dashboard" })
      }
    }
    return true
  },
})
