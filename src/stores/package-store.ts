import { createWithEqualityFn } from "zustand/traditional"

import type {
  HealthContentInput,
  HealthTemplate,
  HealthTemplateQuery,
} from "~/services/health-templates"

type PartialState<S> = Partial<S> | ((state: S) => Partial<S>)

export const DEFAULT_PACKAGE_QUERY: HealthTemplateQuery = {
  pageNum: 1,
  pageSize: 8,
}

export function createEmptyContent(index: number): HealthContentInput {
  return {
    title: `服务${index + 1}`,
    name: "",
    content: "",
  }
}

interface PackageStoreState {
  query: HealthTemplateQuery
  keyword: string
  drawerVisible: boolean
  editing: HealthTemplate | null
  contents: HealthContentInput[]
}

interface PackageStoreActions {
  setState: (next: PartialState<PackageStoreState>) => void
  setQuery: (next: Partial<HealthTemplateQuery>) => void
  replaceQuery: (next: HealthTemplateQuery) => void
  reset: () => void
}

const initialState: PackageStoreState = {
  query: DEFAULT_PACKAGE_QUERY,
  keyword: "",
  drawerVisible: false,
  editing: null,
  contents: [createEmptyContent(0)],
}

export const usePackageStore =
  createWithEqualityFn<PackageStoreState & PackageStoreActions>()((set) => ({
    ...initialState,
    setState: (next) =>
      set((state) => (typeof next === "function" ? next(state) : next)),
    setQuery: (next) =>
      set((state) => ({ query: { ...state.query, ...next } })),
    replaceQuery: (next) => set(() => ({ query: next })),
    reset: () => set(() => initialState),
  }))
