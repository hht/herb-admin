import { createJSONStorage, persist } from "zustand/middleware"
import { createWithEqualityFn } from "zustand/traditional"

interface HerbStore {
  accessToken?: string
  hxUserName?: string
  hxPassword?: string
  hxUuid?: string
}

export const useHerbStore = createWithEqualityFn<HerbStore>()(
  persist(() => ({}), {
    name: "herb",
    storage: createJSONStorage(() => localStorage),
  })
)
