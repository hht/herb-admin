import { UIKitProvider } from "easemob-chat-uikit"
import type { FC, ReactNode } from "react"
import { useEffect } from "react"
import { useHerbStore } from "~/hooks/useStore"
import { EASEMOB_APP_KEY } from "~/libs/constants"
import { easemobTheme } from "~/libs/easemob-theme"
import { CallKitProvider } from "./callkit-provider"

export const Provider: FC<{ children: ReactNode }> = ({ children }) => {
  const { hxUserName, hxPassword } = useHerbStore()

  // 注入自定义 CSS
  useEffect(() => {
    const style = document.createElement("style")
    style.id = "easemob-custom-theme"
    style.textContent = easemobTheme.customCss
    document.head.appendChild(style)

    return () => {
      const existingStyle = document.getElementById("easemob-custom-theme")
      if (existingStyle) {
        document.head.removeChild(existingStyle)
      }
    }
  }, [])

  return (
    <UIKitProvider
      key={hxUserName}
      initConfig={{
        appKey: EASEMOB_APP_KEY,
        userId: hxUserName,
        password: hxPassword,
        useUserInfo: true,
      }}
      theme={{
        mode: easemobTheme.mode,
        avatarShape: easemobTheme.avatarShape,
        bubbleShape: easemobTheme.bubbleShape,
        componentsShape: easemobTheme.componentsShape,
        primaryColor: easemobTheme.primaryColor,
      }}
      local={{ lng: "zh", fallbackLng: "en" }}
    >
      {children}
      <CallKitProvider />
    </UIKitProvider>
  )
}
