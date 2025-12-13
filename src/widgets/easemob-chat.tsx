import { Alert } from "tdesign-react"
import { Chat, ConversationList, UIKitProvider } from "easemob-chat-uikit"

import { useHerbStore } from "~/hooks/useStore"
import { EASEMOB_APP_KEY } from "~/libs/constants"

export const EasemobChatPanel = () => {
  const hxUserName = useHerbStore((state) => state.hxUserName)
  const hxPassword = useHerbStore((state) => state.hxPassword)

  if (!hxUserName || !hxPassword) {
    return (
      <Alert
        theme="warning"
        message="当前账号未下发环信聊天凭据，请联系管理员确认权限。"
      />
    )
  }

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
        primaryColor: "#003c1d",
        mode: "light",
        avatarShape: "square",
        bubbleShape: "square",
        componentsShape: "square",
      }}
      local={{ lng: "zh", fallbackLng: "en" }}
    >
      <div className="flex min-h-[720px] w-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm md:flex-row">
        <div className="border-b border-slate-100 bg-slate-50 p-2 md:w-80 md:border-b-0 md:border-r">
          <div className="h-full overflow-hidden rounded-xl border border-white/60 bg-white">
            <ConversationList />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <Chat />
        </div>
      </div>
    </UIKitProvider>
  )
}
