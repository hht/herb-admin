import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const axiosRequestMock = vi.fn()

vi.mock("axios", () => ({
  default: {
    request: axiosRequestMock,
  },
}))

vi.mock("./useStore", () => ({
  useHerbStore: {
    getState: () => ({ accessToken: "test-token" }),
  },
}))

vi.mock("tdesign-react", () => ({
  MessagePlugin: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock("ahooks", () => ({
  useRequest: vi.fn(),
}))

let request: typeof import("./useRequest").request

beforeAll(async () => {
  ;({ request } = await import("./useRequest"))
})

beforeEach(() => {
  axiosRequestMock.mockReset()
  vi.spyOn(console, "log").mockImplementation(() => {})
})

describe("request()", () => {
  it("sends GET params and returns wrapped data", async () => {
    axiosRequestMock.mockResolvedValueOnce({
      data: {
        code: 200,
        data: { ok: true },
      },
    })

    const result = await request<{ ok: boolean }, { q: string }>(
      "/ping",
      "GET",
      { q: "x" }
    )

    expect(result).toEqual({ ok: true })
    expect(axiosRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        params: { q: "x" },
        headers: { Authorization: "Bearer test-token" },
      })
    )
  })

  it("sends POST body and throws when code is not 200", async () => {
    axiosRequestMock.mockResolvedValueOnce({
      data: {
        code: 400,
        msg: "bad",
        data: null,
      },
    })

    await expect(request("/ping", "POST", { a: 1 })).rejects.toThrow("bad")
  })

  it("returns raw response when no code wrapper", async () => {
    axiosRequestMock.mockResolvedValueOnce({ data: { value: 1 } })

    const result = await request<{ value: number }, Record<string, never>>(
      "/raw",
      "GET",
      {}
    )

    expect(result).toEqual({ value: 1 })
  })

  it("uses absolute url as-is", async () => {
    axiosRequestMock.mockResolvedValueOnce({
      data: {
        code: 200,
        data: { ok: true },
      },
    })

    await request("https://example.com/ping", "GET", {})

    expect(axiosRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://example.com/ping",
      })
    )
  })
})
