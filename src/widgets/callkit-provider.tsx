import { CallKit, type CallKitRef, rootStore } from "easemob-chat-uikit"
import { useRef } from "react"

const userInfoProvider = async (userIds: string[]) => {
  return userIds.map((userId) => ({
    userId,
    nickname: `用户 ${userId}`,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
  }))
}

// 群组信息提供者
const groupInfoProvider = async (groupIds: string[]) => {
  return groupIds.map((groupId) => ({
    groupId,
    groupName: `群组 ${groupId}`,
    groupAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=group-${groupId}`,
  }))
}

export const CallKitProvider = () => {
  const callKitRef = useRef<CallKitRef>(null)
  return (
    <CallKit
      ref={callKitRef}
      chatClient={rootStore.client} // 环信 IM 客户端实例
      userInfoProvider={userInfoProvider} // 用户信息提供者
      groupInfoProvider={groupInfoProvider} // 群组信息提供者
      enableRingtone={true} // 启用铃声
      resizable={true} // 允许调整大小
      draggable={true} // 允许拖拽
    />
  )
}
