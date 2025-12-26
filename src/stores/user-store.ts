import { createWithEqualityFn } from "zustand/traditional"

import type { AppUser, AppUserQuery } from "~/services/app-users"

type PartialState<S> = Partial<S> | ((state: S) => Partial<S>)

export const DEFAULT_USER_QUERY: AppUserQuery = {
  pageNum: 1,
  pageSize: 20,
  role: "5",
}

interface UserStoreState {
  query: AppUserQuery
  userId: string
  nickName: string
  username: string
  drawerVisible: boolean
  editing: AppUser | null
  blacklisted: boolean
  qtnVisible: boolean
  qtnUserId?: number
  qtnUserName: string
}

interface UserStoreActions {
  setState: (next: PartialState<UserStoreState>) => void
  setQuery: (next: Partial<AppUserQuery>) => void
  replaceQuery: (next: AppUserQuery) => void
  reset: () => void
}

const initialState: UserStoreState = {
  query: DEFAULT_USER_QUERY,
  userId: "",
  nickName: "",
  username: "",
  drawerVisible: false,
  editing: null,
  blacklisted: false,
  qtnVisible: false,
  qtnUserId: undefined,
  qtnUserName: "",
}

export const useUserStore =
  createWithEqualityFn<UserStoreState & UserStoreActions>()((set) => ({
    ...initialState,
    setState: (next) =>
      set((state) => (typeof next === "function" ? next(state) : next)),
    setQuery: (next) =>
      set((state) => ({ query: { ...state.query, ...next } })),
    replaceQuery: (next) => set(() => ({ query: next })),
    reset: () => set(() => initialState),
  }))
