import { createWithEqualityFn } from "zustand/traditional"

import type { Employee, EmployeeQuery } from "~/services/employees"

type PartialState<S> = Partial<S> | ((state: S) => Partial<S>)

export const DEFAULT_EMPLOYEE_QUERY: EmployeeQuery = {
  pageNum: 1,
  pageSize: 20,
}

interface EmployeeStoreState {
  query: EmployeeQuery
  activeTab: string
  keyword: string
  drawerVisible: boolean
  detailVisible: boolean
  editing: Employee | null
  detail: Employee | null
  permissionVisible: boolean
  permissionTarget: Employee | null
  permissionRole?: number
}

interface EmployeeStoreActions {
  setState: (next: PartialState<EmployeeStoreState>) => void
  setQuery: (next: Partial<EmployeeQuery>) => void
  replaceQuery: (next: EmployeeQuery) => void
  reset: () => void
}

const initialState: EmployeeStoreState = {
  query: DEFAULT_EMPLOYEE_QUERY,
  activeTab: "all",
  keyword: "",
  drawerVisible: false,
  detailVisible: false,
  editing: null,
  detail: null,
  permissionVisible: false,
  permissionTarget: null,
  permissionRole: undefined,
}

export const useEmployeeStore =
  createWithEqualityFn<EmployeeStoreState & EmployeeStoreActions>()((set) => ({
    ...initialState,
    setState: (next) =>
      set((state) => (typeof next === "function" ? next(state) : next)),
    setQuery: (next) =>
      set((state) => ({ query: { ...state.query, ...next } })),
    replaceQuery: (next) => set(() => ({ query: next })),
    reset: () => set(() => initialState),
  }))
