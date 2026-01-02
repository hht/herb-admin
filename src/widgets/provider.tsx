import {
  UIKitProvider,
  rootStore,
  useAddressContext,
  useClient,
  useConversationContext,
} from "easemob-chat-uikit"
import type { FC, ReactNode } from "react"
import { useEffect } from "react"
import { useMemo } from "react"
import { useRef } from "react"
import { useHerbStore } from "~/hooks/useStore"
import { EASEMOB_APP_KEY } from "~/libs/constants"
import { fetchChatUserProfileByUsername } from "~/services/chat-user-profiles"
import { CallKitProvider } from "./callkit-provider"

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {}

const parseChannel = (channelId: string) => {
  const match = channelId.match(/_(\S*)@/)
  const chatType = channelId.includes("@conference") ? "groupChat" : "singleChat"
  return {
    chatType,
    conversationId: match?.[1] ?? "",
  } as const
}

const extractGroupId = (value: unknown) => {
  const record = toRecord(value)
  const groupId =
    (typeof record.groupid === "string" && record.groupid.trim()) ||
    (typeof record.groupId === "string" && record.groupId.trim()) ||
    (typeof record.id === "string" && record.id.trim()) ||
    ""
  return groupId
}

const extractGroupName = (value: unknown) => {
  const record = toRecord(value)
  const groupName =
    (typeof record.groupname === "string" && record.groupname.trim()) ||
    (typeof record.name === "string" && record.name.trim()) ||
    ""
  return groupName
}

const EasemobAfterLoginBootstrap = () => {
  const client = useClient()
  const { setGroups } = useAddressContext()
  const hxUserName = useHerbStore((state) => state.hxUserName)
  const hxUuid = useHerbStore((state) => state.hxUuid)
  const lastUserRef = useRef<string>("")
  const lastClientRef = useRef<unknown>(null)
  const bootstrappedRef = useRef(false)

  useEffect(() => {
    const debugEnabled =
      (typeof import.meta !== "undefined" && Boolean(import.meta.env?.DEV)) ||
      (typeof window !== "undefined" &&
        window.localStorage?.getItem("easemob_debug") === "1")

    const debug = (...args: unknown[]) => {
      if (!debugEnabled) return
      console.debug("[easemob-bootstrap]", ...args)
    }

    const typedClient = client as unknown as {
      user?: string
      userId?: string
      context?: { userId?: string }
      isOpened?: () => boolean
      getConversationlist?: (payload: {
        pageNum: number
        pageSize: number
      }) => Promise<unknown>
      getJoinedGroups?: (payload: {
        pageNum: number
        pageSize: number
      }) => Promise<unknown>
      getHistoryMessages?: (payload: {
        targetId: string
        pageSize: number
        cursor: number | string | null
        chatType: "singleChat" | "groupChat" | "chatRoom"
        searchDirection: "up" | "down"
      }) => Promise<unknown>
    }

    if (lastClientRef.current !== typedClient) {
      lastClientRef.current = typedClient
      bootstrappedRef.current = false
      lastUserRef.current = ""
    }

    const getClientUserId = () => {
      const fromContext =
        typeof typedClient?.context?.userId === "string"
          ? typedClient.context.userId.trim()
          : ""
      if (fromContext) return fromContext
      const fromUser =
        typeof typedClient?.user === "string" ? typedClient.user.trim() : ""
      if (fromUser) return fromUser
      const fromUserId =
        typeof typedClient?.userId === "string" ? typedClient.userId.trim() : ""
      if (fromUserId) return fromUserId
      return ""
    }

    const userId = getClientUserId()
    const identity =
      (typeof hxUuid === "string" && hxUuid.trim()) ||
      (typeof hxUserName === "string" && hxUserName.trim()) ||
      userId ||
      ""

    debug("effect", {
      hasClient: Boolean(typedClient),
      userId: userId || "-",
      identity: identity || "-",
      hxUserName: hxUserName ?? "-",
      hxUuid: hxUuid ?? "-",
      userFromContext: typedClient?.context?.userId ?? "-",
      userFromUser: typedClient?.user ?? "-",
      hasIsOpened: Boolean(typedClient?.isOpened),
      hasGetConversationlist: Boolean(typedClient?.getConversationlist),
      hasGetHistoryMessages: Boolean(typedClient?.getHistoryMessages),
      hasGetJoinedGroups: Boolean(typedClient?.getJoinedGroups),
    })

    if (!typedClient) return

    let cancelled = false

    const waitUntilReady = async () => {
      const hasOpened = Boolean(typedClient.isOpened)
      for (let i = 0; i < 40; i += 1) {
        if (cancelled) return false
        if (hasOpened && typedClient.isOpened && typedClient.isOpened()) {
          // 某些情况下 SDK 不会立即提供 client.user/context.userId，
          // 这里用 hxUuid/hxUserName 作为“会话身份”兜底，确保能触发 bootstrap。
          lastUserRef.current = identity || getClientUserId() || "unknown"
          return true
        }
        await new Promise((resolve) => setTimeout(resolve, 250))
      }
      const opened = typedClient.isOpened ? Boolean(typedClient.isOpened()) : true
      if (!opened) return false
      lastUserRef.current = identity || getClientUserId() || "unknown"
      return true
    }

    const run = async () => {
      debug("bootstrap start")
      const ready = await waitUntilReady()
      debug("bootstrap ready", {
        ready,
        opened: typedClient.isOpened ? typedClient.isOpened() : "unknown",
        identity: lastUserRef.current || "-",
        clientUserId: getClientUserId() || "-",
      })
      if (!ready || cancelled) return
      if (bootstrappedRef.current) {
        debug("skip bootstrap (already ran)")
        return
      }
      bootstrappedRef.current = true

      try {
        debug("getConversationlist start")
        const result = await typedClient.getConversationlist?.({
          pageNum: 1,
          pageSize: 20,
        })
        const record = toRecord(result)
        const data = toRecord(record.data)
        const channelInfos = Array.isArray(data.channel_infos)
          ? (data.channel_infos as unknown[])
          : []
        debug("getConversationlist ok", {
          channelInfos: channelInfos.length,
        })
        const conversations = channelInfos
          .map((item) => {
            const info = toRecord(item)
            const channelId = typeof info.channel_id === "string" ? info.channel_id : ""
            const { chatType, conversationId } = channelId
              ? parseChannel(channelId)
              : { chatType: "singleChat" as const, conversationId: "" }
            if (!conversationId) return null
            return {
              chatType,
              conversationId,
              unreadCount: typeof info.unread_num === "number" ? info.unread_num : 0,
              lastMessage: (info.lastMessage ?? {}) as unknown,
            }
          })
          .filter(
            (item): item is NonNullable<typeof item> => Boolean(item?.conversationId)
          )

        if (!cancelled && conversations.length) {
          debug("setConversation", { count: conversations.length })
          rootStore.conversationStore.setConversation(conversations as any)
          rootStore.addressStore.getSilentModeForConversations(conversations as any)
        }

      } catch (error) {
        debug("bootstrap conversations/history failed", error)
      }

      try {
        debug("getJoinedGroups start")
        const pageSize = 200
        const maxPages = 10
        // 对齐 easemob-chat-uikit 的实现：pageNum 从 1 开始，避免部分环境下 0 导致异常
        let pageNum = 1
        const merged: unknown[] = []
        let hasNext = true

        while (hasNext && pageNum <= maxPages) {
          debug("getJoinedGroups page", { pageNum, pageSize })
          const result = await typedClient.getJoinedGroups?.({
            pageNum,
            pageSize,
          })
          const record = toRecord(result)
          const data = Array.isArray(record.data) ? (record.data as unknown[]) : []
          debug("getJoinedGroups page ok", { pageNum, groups: data.length })
          merged.push(...data)
          hasNext = data.length === pageSize
          pageNum += 1
        }

        if (!cancelled) {
          debug("setGroups", { count: merged.length, hasNext })
          setGroups(merged as any)
          rootStore.addressStore.setHasGroupsNext(hasNext)

          // ConversationList 默认只展示 conversationStore 里的会话。
          // 若用户加入了群但该群没有“会话”（例如没有消息/未进入过），UI 会只显示最近有消息的群。
          // 这里把“已加入群组”同步成 groupChat 会话，保证 UI 中可见且可点击进入。
          const groupIdToGroup = new Map<string, unknown>()
          for (const group of merged) {
            const groupId = extractGroupId(group)
            if (!groupId) continue
            groupIdToGroup.set(groupId, group)
          }

          const groupIds = [...groupIdToGroup.keys()]
          const groupConversationsToAdd = groupIds
            .map((groupId) => {
              const existed = rootStore.conversationStore.getConversation("groupChat", groupId)
              if (existed) return null
              const group = groupIdToGroup.get(groupId)
              return {
                chatType: "groupChat",
                conversationId: groupId,
                lastMessage: {},
                unreadCount: 0,
                name: extractGroupName(group) || undefined,
              }
            })
            .filter((c): c is NonNullable<typeof c> => Boolean(c))

          if (groupConversationsToAdd.length) {
            debug("setConversation (from groups)", { count: groupConversationsToAdd.length })
            rootStore.conversationStore.setConversation(groupConversationsToAdd as any)
            rootStore.addressStore.getSilentModeForConversations(groupConversationsToAdd as any)
          }
        }
      } catch (error) {
        debug("bootstrap joined groups failed", error)
      }

      debug("bootstrap done")
    }

    run()

    return () => {
      cancelled = true
      debug("cleanup")
    }
  }, [client, hxUserName, hxUuid])

  return null
}

const EasemobUserProfileSync = () => {
  const client = useClient()
  const { currentConversation, conversationList } = useConversationContext()
  const { setAppUserInfo, getGroupMembers } = useAddressContext()
  const syncedRef = useRef<Set<string>>(new Set())
  const updatedSelfRef = useRef(false)
  const conversationSignature = useMemo(
    () =>
      (conversationList ?? [])
        .map((c) => `${c.chatType}:${c.conversationId}`)
        .join("|"),
    [conversationList]
  )

  useEffect(() => {
    if (!client) return
    const typedClient = client as unknown as {
      user?: string
      isOpened?: () => boolean
      updateUserInfo?: (payload: Record<string, unknown>) => Promise<unknown>
    }
    if (typedClient.isOpened && !typedClient.isOpened()) return

    const cancelledRef = { current: false }

    const mergeAppUserInfo = (patch: Record<string, Record<string, unknown>>) => {
      if (!Object.keys(patch).length) return
      setAppUserInfo({
        ...(rootStore.addressStore.appUsersInfo as unknown as Record<
          string,
          Record<string, unknown>
        >),
        ...patch,
      } as any)
    }

    const run = async () => {
      const ids = new Set<string>()

      if (typeof typedClient.user === "string" && typedClient.user.trim()) {
        ids.add(typedClient.user.trim())
      }

      for (const cvs of conversationList ?? []) {
        if (cvs.chatType !== "singleChat") continue
        if (typeof cvs.conversationId === "string" && cvs.conversationId.trim()) {
          ids.add(cvs.conversationId.trim())
        }
      }

      if (currentConversation?.chatType === "groupChat" && currentConversation.conversationId) {
        const groupId = currentConversation.conversationId
        try {
          await getGroupMembers?.(groupId, false)
        } catch {
        }
        const group = rootStore.addressStore.groups.find((item) => item.groupid === groupId)
        const memberIds =
          group?.members?.map((member) => member.userId).filter(Boolean) ?? []

        for (const memberId of memberIds.slice(0, 50)) {
          if (typeof memberId === "string" && memberId.trim()) ids.add(memberId.trim())
        }
      }

      const appUsersInfo = rootStore.addressStore.appUsersInfo as unknown as Record<
        string,
        { nickname?: string; avatarurl?: string }
      >
      const missing = [...ids].filter((id) => {
        const info = appUsersInfo[id]
        const nickname = typeof info?.nickname === "string" ? info.nickname.trim() : ""
        const avatarurl = typeof info?.avatarurl === "string" ? info.avatarurl.trim() : ""
        if (nickname || avatarurl) return false
        return !syncedRef.current.has(id)
      })

      if (!missing.length) return

      const patch: Record<string, Record<string, unknown>> = {}
      await Promise.allSettled(
        missing.map(async (id) => {
          const profile = await fetchChatUserProfileByUsername(id)
          syncedRef.current.add(id)
          if (!profile || cancelledRef.current) return
          patch[profile.userId] = {
            ...(appUsersInfo[profile.userId] as any),
            userId: profile.userId,
            nickname: profile.nickname ?? profile.userId,
            avatarurl: profile.avatarurl ?? (appUsersInfo[profile.userId] as any)?.avatarurl,
          }

          if (!updatedSelfRef.current && typedClient.user && typedClient.user === profile.userId) {
            updatedSelfRef.current = true
            if (typedClient.updateUserInfo) {
              try {
                const payload: Record<string, unknown> = {
                  nickname: profile.nickname ?? profile.userId,
                }
                if (profile.avatarurl) payload.avatarurl = profile.avatarurl
                await typedClient.updateUserInfo(payload)
              } catch {
              }
            }
          }
        })
      )

      if (!cancelledRef.current) mergeAppUserInfo(patch)
    }

    run()

    return () => {
      cancelledRef.current = true
    }
  }, [
    client,
    currentConversation?.chatType,
    currentConversation?.conversationId,
    conversationSignature,
  ])

  return null
}

export const Provider: FC<{ children: ReactNode }> = ({ children }) => {
  const { hxUserName, hxPassword } = useHerbStore()
  const providerKey = `${hxUserName ?? ""}:${hxPassword ?? ""}`

  useEffect(() => {
    return () => {
      try {
        const client = rootStore.client as unknown as { close?: () => void }
        client?.close?.()
      } catch (error) {
        console.log("easemob client close failed:", error)
      }
      try {
        rootStore.clear()
      } catch (error) {
        console.log("easemob rootStore clear failed:", error)
      }
    }
  }, [])

  return (
    <UIKitProvider
      key={providerKey}
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
      <EasemobAfterLoginBootstrap />
      <EasemobUserProfileSync />
      <CallKitProvider />
    </UIKitProvider>
  )
}
