import { UIKitProvider } from "easemob-chat-uikit"
import type { FC, ReactNode } from "react"
import { useHerbStore } from "~/hooks/useStore"
import { EASEMOB_APP_KEY } from "~/libs/constants"
import { CallKitProvider } from "./callkit-provider"

export const Provider: FC<{ children: ReactNode }> = ({ children }) => {
  const { hxUserName, hxPassword } = useHerbStore()

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
        primaryColor: "#267347",
      }}
      local={{ lng: "zh", fallbackLng: "en" }}
    >
      {children}
      <CallKitProvider />
    </UIKitProvider>
  )
}
