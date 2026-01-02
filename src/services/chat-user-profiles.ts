import { rootStore } from "easemob-chat-uikit"

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {}

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
  console.log("[easemob-userprofile]", ...args)
}

const toNonEmptyString = (value: unknown) => {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

const safeParseJsonObject = (value: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(value) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

export const getFallbackAvatarUrl = (userId: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
    userId
  )}`

const guessNicknameFromExtJson = (extJson: Record<string, unknown>) =>
  toNonEmptyString(extJson.nickname) ??
  toNonEmptyString(extJson.nickName) ??
  toNonEmptyString(extJson.nick_name) ??
  toNonEmptyString(extJson.name) ??
  undefined

const looksLikeImageUrl = (value: string) => {
  const url = value.trim()
  if (!url) return false
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("//") ||
    url.startsWith("data:image/")
  )
}

const guessAvatarUrlFromExtJson = (extJson: Record<string, unknown>) => {
  const candidates = [
    extJson.avatarurl,
    extJson.avatarUrl,
    extJson.avatarURL,
    extJson.avatar,
    extJson.headUrl,
    extJson.headURL,
  ]
  for (const candidate of candidates) {
    const str = toNonEmptyString(candidate)
    if (str && looksLikeImageUrl(str)) return str
  }
  return undefined
}

export const EASEMOB_USER_PROFILE_FIELDS = [
  "nickname",
  "avatarurl",
  "mail",
  "phone",
  "gender",
  "sign",
  "birth",
  "ext",
] as const

export type EasemobUserProfileField =
  (typeof EASEMOB_USER_PROFILE_FIELDS)[number]

export type ChatUserProfile = {
  userId: string
  nickname?: string
  avatarurl?: string
  mail?: string
  phone?: string
  gender?: number | string
  sign?: string
  birth?: string
  ext?: string
  extJson?: Record<string, unknown> | null
}

export const fetchChatUserProfilesByUserIds = async (
  userIds: string[],
  fields: readonly EasemobUserProfileField[] = EASEMOB_USER_PROFILE_FIELDS
): Promise<Record<string, ChatUserProfile>> => {
  const ids = userIds.map((id) => id.trim()).filter(Boolean)
  if (!ids.length) return {}

  const client = rootStore.client as unknown as {
    fetchUserInfoById?: (
      userIds: string[],
      fields: string[]
    ) => Promise<unknown>
  }
  if (typeof client.fetchUserInfoById !== "function") return {}

  let result: unknown
  try {
    debug("fetchUserInfoById start", { userIds: ids, fields: [...fields] })
    result = await client.fetchUserInfoById(ids, [...fields])
  } catch {
    debug("fetchUserInfoById failed")
    return {}
  }
  const data = toRecord(toRecord(result).data)

  const profiles: Record<string, ChatUserProfile> = {}
  for (const userId of ids) {
    const raw = toRecord(data[userId])
    console.log("原始数据", raw)
    debug("raw", {
      userId,
      rawKeys: Object.keys(raw),
      avatarType: typeof raw.avatarurl,
      avatarPreview:
        typeof raw.avatarurl === "string" ? raw.avatarurl.slice(0, 120) : "",
      nicknameType: typeof raw.nickname,
      extType: typeof raw.ext,
      extPreview: typeof raw.ext === "string" ? raw.ext.slice(0, 120) : "",
    })
    const profile: ChatUserProfile = {
      userId,
      nickname: toNonEmptyString(raw.nickname),
      avatarurl: toNonEmptyString(raw.avatarurl),
      mail: toNonEmptyString(raw.mail),
      phone: toNonEmptyString(raw.phone),
      gender:
        typeof raw.gender === "number" || typeof raw.gender === "string"
          ? raw.gender
          : undefined,
      sign: toNonEmptyString(raw.sign),
      birth: toNonEmptyString(raw.birth),
      ext: toNonEmptyString(raw.ext),
    }

    profile.extJson = profile.ext ? safeParseJsonObject(profile.ext) : null
    if (profile.extJson) {
      if (!profile.nickname) {
        profile.nickname = guessNicknameFromExtJson(profile.extJson)
      }
      if (!profile.avatarurl) {
        profile.avatarurl = guessAvatarUrlFromExtJson(profile.extJson)
      }
    }
    profiles[userId] = profile
  }

  debug("fetchUserInfoById ok", {
    dataKeys: Object.keys(data),
    sample: ids.slice(0, 5).map((userId) => {
      const profile = profiles[userId]
      const extLen = profile?.ext?.length ?? 0
      const extKeys = profile?.extJson ? Object.keys(profile.extJson) : []
      const avatarPrefix = profile?.avatarurl
        ? profile.avatarurl.slice(0, 80)
        : ""
      return {
        userId,
        hasNickname: Boolean(profile?.nickname),
        hasAvatarurl: Boolean(profile?.avatarurl),
        avatarPrefix,
        extLen,
        extKeys,
      }
    }),
  })

  return profiles
}

export const fetchChatUserProfileByUsername = async (userId: string) => {
  const id = userId.trim()
  if (!id) return null
  debug("fetch single", { userId: id })
  const profiles = await fetchChatUserProfilesByUserIds([id])
  return profiles[id] ?? null
}
