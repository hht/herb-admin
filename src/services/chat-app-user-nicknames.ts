import { listAppUsers } from "~/services/app-users"

type CacheEntry =
  | { status: "hit"; value: string; expiresAt: number }
  | { status: "miss"; expiresAt: number }

const cache = new Map<string, CacheEntry>()

const now = () => Date.now()

const normalizeKey = (username: string) => username.trim()

const isDebugEnabled = () => {
  if (typeof window === "undefined") return false
  const value = window.localStorage?.getItem("easemob_profile_debug")
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  if (!normalized) return false
  return !["0", "false", "off", "no"].includes(normalized)
}

const debug = (...args: unknown[]) => {
  if (!isDebugEnabled()) return
  console.log("[easemob-appuser-nickname]", ...args)
}

export const fetchAppUserNicknameByUsername = async (
  username: string,
  ttlMs = 10 * 60 * 1000
): Promise<string | undefined> => {
  const key = normalizeKey(username)
  if (!key) return undefined

  const cached = cache.get(key)
  if (cached && cached.expiresAt > now()) {
    return cached.status === "hit" ? cached.value : undefined
  }

  try {
    debug("request", { username: key })
    const data = await listAppUsers({ username: key, pageNum: 1, pageSize: 1 })
    const record = data.record?.[0]
    const nickname =
      typeof record?.nickName === "string" ? record.nickName.trim() : ""
    if (nickname) {
      cache.set(key, { status: "hit", value: nickname, expiresAt: now() + ttlMs })
      debug("hit", { username: key, nickname })
      return nickname
    }
    cache.set(key, { status: "miss", expiresAt: now() + ttlMs })
    debug("miss", { username: key })
    return undefined
  } catch (error) {
    cache.set(key, { status: "miss", expiresAt: now() + ttlMs })
    debug("error", { username: key, error })
    return undefined
  }
}

export const fetchAppUserNicknamesByUsernames = async (
  usernames: string[],
  options?: { limit?: number }
): Promise<Record<string, string>> => {
  const limit = Math.max(1, Math.min(options?.limit ?? 20, 50))
  const unique = [...new Set(usernames.map(normalizeKey).filter(Boolean))].slice(0, limit)

  const result: Record<string, string> = {}
  for (const username of unique) {
    const nickname = await fetchAppUserNicknameByUsername(username)
    if (nickname) result[username] = nickname
  }
  return result
}

