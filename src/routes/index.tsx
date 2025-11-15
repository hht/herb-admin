import { createFileRoute } from "@tanstack/react-router"
import { Button } from "tdesign-react"

export const Route = createFileRoute("/")({
  component: Index,
})

function Index() {
  return (
    <div className="p-2">
      <h3>Welcome Home!</h3>
      <Button theme="primary">TD Button</Button>
    </div>
  )
}
