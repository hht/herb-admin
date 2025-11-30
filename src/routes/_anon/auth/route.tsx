import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { LockOnIcon, UserIcon } from "tdesign-icons-react"
import { Alert, Button, Checkbox, Input, MessagePlugin } from "tdesign-react"

import { Screen } from "~/components"
import { useRequest } from "~/hooks/useRequest"
import { useHerbStore } from "~/hooks/useStore"
import { login, loginFormSchema, type LoginFormValues } from "~/services/auth"

const LAST_ACCOUNT_KEY = "herb:last-account"

export const Route = createFileRoute("/_anon/auth")({
  validateSearch: (search: { redirect?: string }) => search,
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()
  const { redirect } = Route.useSearch()
  const setSession = useHerbStore((state) => state.setSession)
  const getRememberedAccount = () =>
    typeof window === "undefined"
      ? ""
      : localStorage.getItem(LAST_ACCOUNT_KEY) ?? ""

  const [formValues, setFormValues] = useState<LoginFormValues>(() => ({
    username: getRememberedAccount(),
    password: "",
  }))
  const [remember, setRemember] = useState(() =>
    Boolean(getRememberedAccount())
  )
  const [errorMessage, setErrorMessage] = useState<string>()

  const { runAsync, loading } = useRequest(login, {
    manual: true,
  })

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(undefined)
    const parsed = loginFormSchema.safeParse(formValues)
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "请输入账号和密码")
      return
    }
    try {
      const session = await runAsync(parsed.data)
      setSession({
        accessToken: session.token,
        hxPassword: session.hxPassword,
        hxUserName: session.hxUserName,
        hxUuid: session.hxUuid,
      })
      if (remember) {
        localStorage.setItem(LAST_ACCOUNT_KEY, parsed.data.username)
      } else {
        localStorage.removeItem(LAST_ACCOUNT_KEY)
      }
      router.navigate({
        to: redirect ?? "/dashboard",
        replace: true,
      })
    } catch (error) {
      const message =
        typeof error === "string"
          ? error
          : error instanceof Error
          ? error.message
          : "登录失败，请稍后重试"
      setErrorMessage(message)
    }
  }

  const handleForgotPassword = () => {
    MessagePlugin.info("请联系管理员重置密码")
  }

  return (
    <Screen className="min-h-screen w-full flex bg-white text-slate-900">
      <div className="flex flex-1 items-center justify-center px-6 py-10 lg:px-20">
        <div className="w-full max-w-[420px] space-y-8">
          <header className="space-y-1">
            <div className="flex items-center gap-3 text-[#0052d9]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#0052d9] font-semibold">
                T
              </div>
              <div className="text-xl font-semibold">Change Name</div>
            </div>
            <div className="mt-6 space-y-2">
              <p className="text-sm text-slate-500">登录到</p>
              <h1 className="text-3xl font-semibold">中医管理段</h1>
              <p className="text-sm text-slate-500">
                没有账号吗？
                <button
                  type="button"
                  className="text-[#0052d9] hover:underline"
                  onClick={() => MessagePlugin.info("请联系管理员")}
                >
                  注册新账号
                </button>
              </p>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Input
                size="large"
                placeholder="请输入内容"
                value={formValues.username}
                onChange={(value) =>
                  setFormValues((prev) => ({ ...prev, username: value }))
                }
                prefixIcon={<UserIcon />}
              />
            </div>
            <div className="space-y-2">
              <Input
                size="large"
                type="password"
                placeholder="请输入密码"
                value={formValues.password}
                onChange={(value) =>
                  setFormValues((prev) => ({ ...prev, password: value }))
                }
                prefixIcon={<LockOnIcon />}
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <Checkbox
                checked={remember}
                onChange={(value) => setRemember(Boolean(value))}
              >
                记住账号
              </Checkbox>
              <button
                type="button"
                className="text-[#0052d9] hover:underline"
                onClick={handleForgotPassword}
              >
                忘记密码？
              </button>
            </div>

            {errorMessage ? (
              <Alert
                theme="error"
                message={errorMessage}
                close
                onClose={() => setErrorMessage(undefined)}
              />
            ) : null}

            <Button
              type="submit"
              theme="primary"
              size="large"
              className="w-full"
              loading={loading}
            >
              登录
            </Button>
            <Button
              theme="default"
              variant="text"
              size="medium"
              className="w-full"
              onClick={() => MessagePlugin.info("短信登录功能开发中")}
            >
              使用短信登录
            </Button>
          </form>

          <footer className="pt-4 text-xs text-slate-400">
            Copyright © 2021–2022 Tencent. All Rights Reserved
          </footer>
        </div>
      </div>

      <div className="relative hidden flex-1 lg:flex">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1400&q=80')",
          }}
        />
        <div className="relative z-10 flex h-full w-full items-center justify-center bg-white/60 backdrop-blur">
          <div className="rounded-full bg-gradient-to-br from-[#3b82f6] via-[#22d3ee] to-[#22c55e] p-6 shadow-2xl">
            <div className="h-40 w-40 rounded-full bg-white/80" />
          </div>
        </div>
      </div>
    </Screen>
  )
}
