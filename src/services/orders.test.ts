import { beforeEach, describe, expect, it, vi } from "vitest"

const { requestMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
}))

vi.mock("~/hooks/useRequest", () => ({
  request: requestMock,
}))

import { createOrder, getAppOrderDetail } from "./orders"

beforeEach(() => {
  requestMock.mockReset()
})

describe("orders service", () => {
  it("createOrder calls POST endpoint and parses response", async () => {
    requestMock.mockResolvedValueOnce({
      orderId: 1,
      orderNum: "NO-1",
      userAnswerId: 123,
      contents: [{ title: null, name: "n", content: "c" }],
    })

    const payload = {
      userAnswerId: "123",
      packageName: "pkg",
      price: 99,
      contents: [{ title: "服务1", name: "n", content: "c" }],
    }

    const result = await createOrder(payload)

    expect(requestMock).toHaveBeenCalledWith(
      "/backend/order/create",
      "POST",
      payload
    )
    expect(result.orderId).toBe(1)
    expect(result.userAnswerId).toBe("123")
    expect(result.contents?.[0]?.title).toBeUndefined()
    expect(result.contents?.[0]).toMatchObject({ name: "n", content: "c" })
  })

  it("getAppOrderDetail calls GET endpoint and defaults contents", async () => {
    requestMock.mockResolvedValueOnce({
      orderId: 2,
      userAnswerId: null,
    })

    const result = await getAppOrderDetail({ orderId: 2 })

    expect(requestMock).toHaveBeenCalledWith(
      "/app/order/detail",
      "GET",
      { orderId: 2 }
    )
    expect(result.contents).toEqual([])
  })
})
