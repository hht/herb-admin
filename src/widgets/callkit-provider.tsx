import { CallKit, type CallKitRef, rootStore } from "easemob-chat-uikit"
import { useRef } from "react"
import {
  fetchChatUserProfilesByUserIds,
  getFallbackAvatarUrl,
} from "~/services/chat-user-profiles"
import { fetchAppUserNicknameByUsername } from "~/services/chat-app-user-nicknames"

const isDebugEnabled = () => {
  const localFlag = (key: string) => {
    if (typeof window === "undefined") return false
    const value = window.localStorage?.getItem(key)
    if (!value) return false
    const normalized = value.trim().toLowerCase()
    if (!normalized) return false
    return !["0", "false", "off", "no"].includes(normalized)
  }
  return localFlag("easemob_profile_debug")
}

const debug = (...args: unknown[]) => {
  if (!isDebugEnabled()) return
  console.log("[easemob-callkit-userInfoProvider]", ...args)
}

const userInfoProvider = async (userIds: string[]) => {
  const profiles = await fetchChatUserProfilesByUserIds(userIds)
  const result = await Promise.all(
    userIds.map(async (userId) => {
      const normalizedId = userId.trim()
      const profile = profiles[normalizedId]
      const profileNickname =
        typeof profile?.nickname === "string" ? profile.nickname.trim() : ""
      const backendNickname = await fetchAppUserNicknameByUsername(normalizedId)
      const nickname = backendNickname || profileNickname || normalizedId
      const avatarUrl = profile?.avatarurl ?? getFallbackAvatarUrl(normalizedId)
      return { userId: normalizedId, nickname, avatarUrl }
    })
  )
  debug("response", {
    sample: result.slice(0, 5).map((item) => ({
      userId: item.userId,
      nickname: item.nickname,
      avatarUrlPrefix: item.avatarUrl ? item.avatarUrl.slice(0, 80) : "",
    })),
  })
  return result
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
