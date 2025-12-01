import { useRequest as useRequestBase } from "ahooks"
import {
  type Options,
  type Plugin,
  type Service,
} from "ahooks/lib/useRequest/src/types"
import axios from "axios"

import { MessagePlugin } from "tdesign-react"
import { BASE_URL } from "~/libs/constants"
import { useHerbStore } from "./useStore"

type Response<T> =
  | {
      code?: number
      msg?: string
      data?: T
    }
  | T

export const request = async <T, U>(
  url: string,
  method: string,
  body: U = {} as U
): Promise<T> => {
  return await axios
    .request<T, { data: Response<T> }>({
      url: url.startsWith("http") ? url : `${BASE_URL}${url}`,
      method,
      headers: {
        Authorization: `Bearer ${useHerbStore.getState().accessToken}`,
      },
      ...(method === "GET"
        ? {
            params: {
              ...body,
            },
          }
        : {
            data: { ...body },
          }),
    })
    .then((res) => res.data)
    .then((res) => {
      if (typeof res === "object" && res !== null && "code" in res) {
        if (res.code !== 200) {
          throw new Error(res.msg)
        } else {
          console.log("🚀", url)
          console.log("👜", JSON.stringify(body))
          console.log("✅", JSON.stringify(res))
          return res.data as T
        }
      }
      console.log("🚀", url)
      console.log("👜", JSON.stringify(body))
      console.log("✅", JSON.stringify(res))
      return res as T
    })
    .catch((error) => {
      // console.log("🚀", url)
      // console.log("👜", JSON.stringify(body))
      // console.log("🚫", JSON.stringify(error.message ?? error))
      throw error
    })
}

export const useRequest = <TData, TParams extends unknown[]>(
  service: Service<TData, TParams>,
  options?: Options<TData, TParams>,
  plugins?: Plugin<TData, TParams>[]
) =>
  useRequestBase(
    service,
    {
      onError: (error) => {
        console.log("useRequest出错：", error)
        MessagePlugin.error({
          content: error.message,
          duration: 3000,
          closeBtn: true,
        })
      },
      ...options,
    },
    plugins
  )

export const toInfinite = <T>(data: PaginationResponse<T>) => {
  return {
    list: data.list ?? [],
    nextId: data.isLastPage ? undefined : data.nextPage,
  }
}
