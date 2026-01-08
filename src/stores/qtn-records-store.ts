import { createWithEqualityFn } from "zustand/traditional"

import type {
  ConsultationDetail,
  QtnRecord,
  QtnRecordPage,
} from "~/services/app-user-qtn"

type PartialState<S> = Partial<S> | ((state: S) => Partial<S>)

export const DEFAULT_QTN_PAGE = { pageNum: 1, pageSize: 10 }

interface QtnRecordsStoreState {
  page: QtnRecordPage
  mode: "normal" | "compare"
  view: "list" | "detail" | "compare"
  selected: QtnRecord[]
  activeRecord: QtnRecord | null
  detailData: ConsultationDetail | null
  compareData: ConsultationDetail[]
  patientFilter: string
}

interface QtnRecordsStoreActions {
  setState: (next: PartialState<QtnRecordsStoreState>) => void
  setPage: (next: Partial<QtnRecordPage>) => void
  reset: () => void
}

const initialState: QtnRecordsStoreState = {
  page: {
    record: [],
    total: 0,
    pageNum: DEFAULT_QTN_PAGE.pageNum,
    pageSize: DEFAULT_QTN_PAGE.pageSize,
  },
  mode: "normal",
  view: "list",
  selected: [],
  activeRecord: null,
  detailData: null,
  compareData: [],
  patientFilter: "全部病患",
}

export const useQtnRecordsStore =
  createWithEqualityFn<QtnRecordsStoreState & QtnRecordsStoreActions>()(
    (set) => ({
      ...initialState,
      setState: (next) =>
        set((state) => (typeof next === "function" ? next(state) : next)),
      setPage: (next) =>
        set((state) => ({ page: { ...state.page, ...next } })),
      reset: () => set(() => initialState),
    })
  )
