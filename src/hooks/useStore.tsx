import { createJSONStorage, persist } from "zustand/middleware"
import { createWithEqualityFn } from "zustand/traditional"

const initialState = {
  accessToken: undefined as string | undefined,
  hxUserName: undefined as string | undefined,
  hxPassword: undefined as string | undefined,
  hxUuid: undefined as string | undefined,
}

type SessionState = typeof initialState

interface HerbStore extends SessionState {
  setSession: (payload: SessionState) => void
  resetSession: () => void
}

export const useHerbStore = createWithEqualityFn<HerbStore>()(
  persist(
    (set) => ({
      ...initialState,
      setSession: (payload) => set(() => ({ ...payload })),
      resetSession: () => set(() => ({ ...initialState })),
    }),
    {
      name: "herb",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        hxUserName: state.hxUserName,
        hxPassword: state.hxPassword,
        hxUuid: state.hxUuid,
      }),
    }
  )
)
