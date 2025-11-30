import { createFileRoute } from "@tanstack/react-router"
import { Button } from "tdesign-react"
import { useHerbStore } from "~/hooks/useStore"

export const Route = createFileRoute("/_herb/dashboard")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      Hello "/(herb)/dashboard/"!
      <Button onClick={useHerbStore.getState().resetSession}>退出</Button>
    </div>
  )
}
