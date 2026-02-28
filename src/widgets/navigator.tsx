import { useNavigate, useRouterState } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import {
  AppIcon,
  ViewListIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "tdesign-icons-react"
import { Dropdown } from "tdesign-react"

import { cn } from "~/libs/utils"
import { useHerbStore } from "~/hooks/useStore"
import {
  MenuChatIcon,
  MenuCollapseIcon,
  MenuConsultIcon,
  MenuEmployeeIcon,
  MenuOrderIcon,
  MenuProfileIcon,
  MenuUserIcon,
} from "~/components/figma-icons"
import type { SvgIconComponent } from "~/components/figma-icons"

const NAV_COLLAPSED_KEY = "herb:nav-collapsed"

const MENU_GROUPS: {
  label: string
  items: {
    label: string
    to?: string
    disabled?: boolean
    children?: { label: string; to?: string; disabled?: boolean }[]
  }[]
}[] = [
  {
    label: "健康顾问",
    items: [{ label: "聊天室", to: "/dashboard" }],
  },
  {
    label: "管理",
    items: [
      {
        label: "订单管理",
        children: [
          { label: "订单列表", to: "/orders" },
          { label: "套餐设置", to: "/packages" },
        ],
      },
      { label: "问诊管理", to: "/consultations" },
      { label: "病人列表", to: "/users" },
      { label: "员工信息", to: "/employees" },
    ],
  },
  {
    label: "更多",
    items: [{ label: "个人页", disabled: true }],
  },
]

const MENU_ICON_MAP: Record<string, SvgIconComponent> = {
  聊天室: MenuChatIcon,
  订单管理: MenuOrderIcon,
  预约管理: MenuConsultIcon,
  问诊管理: MenuConsultIcon,
  问诊: MenuConsultIcon,
  病人列表: MenuUserIcon,
  员工管理: MenuEmployeeIcon,
  员工信息: MenuEmployeeIcon,
  个人页: MenuProfileIcon,
  药材管理: MenuConsultIcon,
}

const renderMenuIcon = (label?: string, className?: string) => {
  if (!label) return <ViewListIcon size={20} className={className} />
  const Icon = MENU_ICON_MAP[label]
  if (!Icon) return <ViewListIcon size={20} className={className} />
  return <Icon className={className} />
}

const getCollapsedGroupLabel = (label: string) => {
  if (label.length <= 2) return label
  return label.slice(-2)
}

const getRoleHomeLabel = (role?: number) => {
  if (role === 3) return "医生"
  return "健康顾问"
}

export const Navigator = () => {
  const navigate = useNavigate()
  const routerState = useRouterState()
  const role = useHerbStore((state) => state.role)
  const activePath = routerState.location.pathname
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false
    try {
      const raw = window.localStorage?.getItem(NAV_COLLAPSED_KEY)
      return raw === "1" || raw === "true"
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      window.localStorage?.setItem(NAV_COLLAPSED_KEY, collapsed ? "1" : "0")
    } catch {
      // ignore
    }
  }, [collapsed])

  const toggleItem = (key: string) => {
    setExpandedItems((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    )
  }

  return (
    <aside
      className={cn(
        "flex h-screen flex-shrink-0 flex-col border-r border-border bg-white",
        collapsed ? "w-[72px]" : "w-[232px]"
      )}
    >
      {/* Logo 区域 */}
      <div
        className={cn(
          "flex h-14 items-center border-b border-border",
          collapsed ? "justify-center px-0" : "px-6"
        )}
      >
        <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
          <div className="flex size-7 items-center justify-center rounded-full bg-neutral-950">
            <AppIcon size={14} className="text-white" />
          </div>
          {!collapsed ? (
            <span className="text-[23px] font-semibold leading-none tracking-[-0.92px] text-neutral-950">
              中医 APP
            </span>
          ) : null}
        </div>
      </div>

      {/* 菜单区域 */}
      <div className="flex-1 overflow-y-auto p-2">
        {MENU_GROUPS.map((group) => {
          const displayGroupLabel =
            group.label === "健康顾问" ? getRoleHomeLabel(role) : group.label
          return (
            <div className="mb-1" key={group.label}>
              <div
                className={cn(
                  "pb-1 pt-4 text-xs leading-5 text-black/40",
                  collapsed ? "px-0 text-center" : "px-4"
                )}
              >
                {collapsed
                  ? getCollapsedGroupLabel(displayGroupLabel)
                  : displayGroupLabel}
              </div>
              {group.items.map((item) => {
                  const isChildActive =
                    item.children?.some(
                      (child) => child.to && child.to === activePath
                    ) ?? false
                  const isActive =
                    (item.to && activePath === item.to) || isChildActive
                  const itemKey = `${group.label}-${item.label}`
                  const hasChildren = (item.children?.length ?? 0) > 0
                  const isItemExpanded = expandedItems.includes(itemKey)
                  const iconClassName = cn(
                    "size-5",
                    isActive ? "text-brand" : "text-neutral-950/60"
                  )

                  const childOptions = (item.children ?? [])
                    .filter((child) => child.to)
                    .map((child) => ({
                      content: child.label,
                      value: child.to!,
                      disabled: child.disabled,
                    }))

                  const collapsedButton = (
                    <button
                      type="button"
                      title={item.label}
                      aria-label={item.label}
                      disabled={item.disabled}
                      onClick={() => {
                        if (item.to) navigate({ to: item.to })
                      }}
                      className={cn(
                        "flex w-full items-center justify-center rounded py-2 text-sm text-neutral-950/60 hover:bg-neutral-950/5",
                        isActive && "bg-brand-light text-brand",
                        item.disabled && "opacity-40 cursor-not-allowed"
                      )}
                    >
                      {renderMenuIcon(item.label, iconClassName)}
                    </button>
                  )

                  return (
                    <div key={item.label} className="space-y-1">
                      {collapsed ? (
                        hasChildren ? (
                          <Dropdown
                            trigger="click"
                            options={childOptions}
                            onClick={(dropdown) => {
                              if (dropdown.value) navigate({ to: String(dropdown.value) })
                            }}
                          >
                            {collapsedButton}
                          </Dropdown>
                        ) : (
                          collapsedButton
                        )
                      ) : (
                        <button
                          type="button"
                          disabled={item.disabled}
                          onClick={() => {
                            if (hasChildren) {
                              toggleItem(itemKey)
                              return
                            }
                            if (item.to) {
                              navigate({ to: item.to })
                            }
                          }}
                          className={cn(
                            "flex w-full items-center gap-2 rounded px-4 py-1.5 text-sm text-neutral-950/60 hover:bg-neutral-950/5",
                            isActive && "bg-brand-light text-brand",
                            item.disabled && "opacity-40 cursor-not-allowed"
                          )}
                        >
                          {renderMenuIcon(item.label, iconClassName)}
                          <span className="flex-1 text-left">{item.label}</span>
                          {hasChildren ? (
                            isItemExpanded ? (
                              <ChevronUpIcon size={16} />
                            ) : (
                              <ChevronDownIcon size={16} />
                            )
                          ) : null}
                        </button>
                      )}
                      {hasChildren && isItemExpanded
                        ? item.children?.map((child) => {
                            const isChildActive =
                              child.to && activePath === child.to
                            return (
                              <button
                                key={child.label}
                                type="button"
                                disabled={child.disabled}
                                onClick={() =>
                                  child.to && navigate({ to: child.to })
                                }
                                className={cn(
                                  "block w-full rounded px-4 py-1.5 pl-11 text-left text-sm text-neutral-950/60 hover:bg-neutral-950/5",
                                  isChildActive && "bg-brand-light text-brand",
                                  child.disabled &&
                                    "opacity-40 cursor-not-allowed"
                                )}
                              >
                                {child.label}
                              </button>
                            )
                          })
                        : null}
                    </div>
                  )
                })}
            </div>
          )
        })}
      </div>

      {/* 底部操作区 */}
      <div
        className={cn(
          "flex h-14 items-center border-t border-border",
          collapsed ? "justify-center px-0" : "px-6"
        )}
      >
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded hover:bg-neutral-950/5"
          aria-label={collapsed ? "展开菜单" : "收起菜单"}
          onClick={() => setCollapsed((prev) => !prev)}
        >
          <MenuCollapseIcon className="size-4 text-neutral-950/60" />
        </button>
      </div>
    </aside>
  )
}
