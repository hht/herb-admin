/* eslint-disable react-refresh/only-export-components */

import { useEffect, useMemo, useRef } from "react"

import { useScrollTabs } from "~/components/qtn/qtn-detail"

export type ConsultationSectionKey = "info" | "questionnaire" | "diagnosis"

export const CONSULTATION_TABS = [
  { key: "info", label: "问诊信息" },
  { key: "questionnaire", label: "患者问卷" },
  { key: "diagnosis", label: "诊断报告" },
] as const satisfies ReadonlyArray<{ key: ConsultationSectionKey; label: string }>

export const useConsultationScrollTabs = (params: {
  enabled: boolean
  initialSectionKey?: ConsultationSectionKey
  marker?: string | number | null
}) => {
  const tabs = useMemo(() => CONSULTATION_TABS.map((tab) => ({ ...tab })), [])
  const { containerRef, setSectionRef, activeKey, scrollTo } = useScrollTabs(
    tabs,
    { lockOnScrollToMs: 1200, hysteresis: 16 }
  )

  const marker = params.marker ?? null
  const markerRef = useRef<string | null>(null)
  const enabledRef = useRef(false)

  useEffect(() => {
    if (!params.enabled) {
      enabledRef.current = false
      markerRef.current = null
      return
    }

    if (enabledRef.current) return
    enabledRef.current = true

    const nextKey = params.initialSectionKey ?? CONSULTATION_TABS[0]?.key
    if (!nextKey) return

    let raf = 0
    raf = requestAnimationFrame(() => {
      scrollTo(nextKey, "auto")
      requestAnimationFrame(() => scrollTo(nextKey, "auto"))
    })
    return () => {
      if (raf) cancelAnimationFrame(raf)
    }
  }, [params.enabled, params.initialSectionKey, scrollTo])

  useEffect(() => {
    if (!params.enabled) return
    const nextKey = params.initialSectionKey ?? CONSULTATION_TABS[0]?.key
    if (!nextKey) return
    if (marker === null) return
    const nextMarker = String(marker)
    if (!nextMarker) return
    if (markerRef.current === nextMarker) return
    markerRef.current = nextMarker

    let raf = 0
    raf = requestAnimationFrame(() => {
      scrollTo(nextKey, "auto")
      requestAnimationFrame(() => scrollTo(nextKey, "auto"))
    })
    return () => {
      if (raf) cancelAnimationFrame(raf)
    }
  }, [marker, params.enabled, params.initialSectionKey, scrollTo])

  return { tabs, containerRef, setSectionRef, activeKey, scrollTo }
}

export const ConsultationTabsBar = ({
  activeKey,
  enabled,
  onSelect,
}: {
  activeKey: string
  enabled: boolean
  onSelect: (key: ConsultationSectionKey) => void
}) => {
  return (
    <div className="border-b border-[#e7e7e7] bg-white px-12">
      <div className="flex h-12 items-center gap-6 text-[14px] leading-[22px]">
        {CONSULTATION_TABS.map((tab) => {
          const isActive = tab.key === activeKey
          return (
            <button
              key={tab.key}
              type="button"
              className={`relative flex h-full items-center ${
                isActive ? "text-brand" : "text-[rgba(0,0,0,0.6)]"
              }`}
              onClick={() => {
                if (!enabled) return
                onSelect(tab.key)
              }}
            >
              {tab.label}
              <span
                className={`absolute bottom-0 left-0 h-[2px] w-full rounded-full ${
                  isActive ? "bg-brand" : "bg-transparent"
                }`}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
