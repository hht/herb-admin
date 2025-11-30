import {
  createRootRoute,
  Outlet,
  ScrollRestoration,
} from "@tanstack/react-router"

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => <div className="w-screen h-screen">404</div>,
})

function RootComponent() {
  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  )
}
