import {
  Chat,
  ConversationList,
  useClient,
  type CallKitProps,
} from "easemob-chat-uikit"
import { useEffect, useMemo } from "react"

const ChatWorkspace = () => {
  const client = useClient()

  useEffect(() => {
    if (!client) {
      return
    }
    console.log("客户端", client)
  }, [client])
  const callkitProps = useMemo<Partial<CallKitProps>>(
    () => ({
      chatClient: client ?? undefined,
      enableRealCall: true,
      enableRingtone: true,
      ringtoneLoop: true,
      onCallError: (error) => {
        console.error("CallKit error", error)
      },
      onCallStatusChanged: (status) => {
        console.info("CallKit status", status)
      },
      userInfoProvider: async (userIds) =>
        userIds.map((userId) => ({ userId, nickname: userId })),
    }),
    [client]
  )

  return (
    <div className="flex min-h-[720px] w-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm md:flex-row">
      <div className="border-b border-slate-100 bg-slate-50 p-2 md:w-80 md:border-b-0 md:border-r">
        <div className="h-full overflow-hidden rounded-xl border border-white/60 bg-white">
          <ConversationList />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <Chat
          useCallkit
          callkitProps={callkitProps}
          headerProps={{
            suffixIcon: ["PIN", "THREAD", "AUDIO", "VIDEO"],
          }}
        />
      </div>
    </div>
  )
}

export const EasemobChatPanel = () => {
  return <ChatWorkspace />
}
