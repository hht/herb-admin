import { createFileRoute } from "@tanstack/react-router"
import { EasemobChatPanel } from "~/widgets"

export const Route = createFileRoute("/_herb/dashboard")({
  component: RouteComponent,
})

function RouteComponent() {
  return <EasemobChatPanel />
}
