import { createWithEqualityFn } from "zustand/traditional"

import type { OrderContentInput } from "~/services/orders"

type PartialState<S> = Partial<S> | ((state: S) => Partial<S>)

export function createEmptyOrderContent(index: number): OrderContentInput {
  return {
    title: `服务${index + 1}`,
    name: "",
    content: "",
  }
}

interface OrderStoreState {
  contents: OrderContentInput[]
  createdOrder: {
    orderId?: number | null
    orderNum?: string | null
  } | null
}

interface OrderStoreActions {
  setState: (next: PartialState<OrderStoreState>) => void
  reset: () => void
}

const initialState: OrderStoreState = {
  contents: [createEmptyOrderContent(0)],
  createdOrder: null,
}

export const useOrderStore =
  createWithEqualityFn<OrderStoreState & OrderStoreActions>()((set) => ({
    ...initialState,
    setState: (next) =>
      set((state) => (typeof next === "function" ? next(state) : next)),
    reset: () => set(() => initialState),
  }))
