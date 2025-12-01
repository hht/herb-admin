import { clsx, type ClassValue } from "clsx"
import dayjs from "dayjs"
import "dayjs/locale/en"
import "dayjs/locale/es"
import "dayjs/locale/ms"
import "dayjs/locale/pt"
import "dayjs/locale/tr"
import "dayjs/locale/zh"
import isToday from "dayjs/plugin/isToday"
import isYesterday from "dayjs/plugin/isYesterday"
import localeData from "dayjs/plugin/localeData"
import relativeTime from "dayjs/plugin/relativeTime"
import utc from "dayjs/plugin/utc"
import i18n from "i18next"
import { twMerge } from "tailwind-merge"
import { MessagePlugin } from "tdesign-react"

export const defaultNS = "app"

export const t = i18n.t.bind(i18n)

export { i18n }

dayjs.extend(localeData)
dayjs.extend(utc)
dayjs.extend(relativeTime)
dayjs.extend(isToday)
dayjs.extend(isYesterday)

export { dayjs }

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

export const uuid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })

export const formatCurrency = (
  value?: number | string,
  currency: string = "USD",
  locale: string = "en"
) => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
  }).format(isNaN(Number(value)) ? 0 : Number(value))
}

export const formatDecimal = (value: string | number, fraction = 0.01) => {
  const precision = fraction.toString().split(".")[1]?.length ?? 0
  return new Intl.NumberFormat(i18n.resolvedLanguage, {
    style: "decimal",
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(isNaN(Number(value)) ? 0 : Number(value))
}

export const copyToClipboard = async (
  text?: string | number
): Promise<void> => {
  try {
    if (!text) {
      throw new Error("No text to copy")
    }
    await navigator.clipboard.writeText(`${text}`)
    MessagePlugin.success(t("message.copiedSuccess"))
  } catch (err) {
    console.log("Failed to write to clipboard: ", err)
    MessagePlugin.error(t("message.copiedFailed"))
  }
}

export const readFromClipboard = async (): Promise<string> => {
  try {
    return await navigator.clipboard.readText()
  } catch (err) {
    console.log("Failed to read clipboard contents: ", err)
    return ""
  }
}

export const waitFor = (ms = 200) =>
  new Promise((resolve) => setTimeout(resolve, ms))

export const getCurrentFuturePrice = (params: {
  futureCode: string
  action: "buy" | "sell"
  volatility?: number
  clazzSpread?: number
  buyPrice?: string | number
  sellPrice?: string | number
  Ask?: number
  Bid?: number
}) => {
  const { Ask, Bid, action, volatility, clazzSpread, buyPrice, sellPrice } =
    params
  const diff = ((volatility ?? 0) * (clazzSpread ?? 0)) / 2
  const price =
    action === "buy"
      ? (Ask ?? Number(buyPrice)) + diff
      : (Bid ?? Number(sellPrice)) - diff
  return price
}
export const getFutureOrderPrice = (params: {
  action: "buy" | "sell"
  enablePending: boolean
  currentPrice?: number
  ratio: number
  volatility?: number
  clazzSpread?: number
  buyPrice?: string | number
  sellPrice?: string | number
  futureCode: string
  Ask?: number
  Bid?: number
}) => {
  const { action, enablePending, currentPrice, ratio, volatility } = params
  const price = enablePending
    ? currentPrice ?? 0
    : getCurrentFuturePrice(params)
  const localRatio = action === "buy" ? 1 : -1
  const finalDiff = (volatility ?? 0) * 100 * ratio * localRatio
  return Math.max(price + finalDiff, 0)
}
