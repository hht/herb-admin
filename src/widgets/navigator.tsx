import { useNavigate, useRouterState } from "@tanstack/react-router"
import { useState } from "react"
import {
  AppIcon,
  ViewListIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  UserIcon,
} from "tdesign-icons-react"

import { cn } from "~/libs/utils"

const MENU_GROUPS: {
  label: string
  expandable?: boolean
  items: {
    label: string
    to?: string
    disabled?: boolean
    children?: { label: string; to?: string; disabled?: boolean }[]
  }[]
}[] = [
  {
    label: "健康顾问",
    expandable: true,
    items: [
      { label: "聊天室", to: "/dashboard" },
      { label: "消息", to: "/dashboard" },
      { label: "未读" },
      { label: "问诊" },
      { label: "内部" },
      { label: "已完成" },
    ],
  },
  {
    label: "管理",
    items: [
      {
        label: "订单管理",
        children: [{ label: "套餐管理", to: "/packages" }],
      },
      { label: "预约管理", disabled: true },
      { label: "用户管理", to: "/users" },
      { label: "药材管理", disabled: true },
    ],
  },
  {
    label: "管理员",
    items: [{ label: "员工管理", to: "/employees" }],
  },
  {
    label: "更多",
    expandable: true,
    items: [{ label: "个人页", disabled: true }],
  },
]

export const Navigator = () => {
  const navigate = useNavigate()
  const routerState = useRouterState()
  const activePath = routerState.location.pathname
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["健康顾问"])
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    )
  }

  const toggleItem = (key: string) => {
    setExpandedItems((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    )
  }

  return (
    <aside className="flex h-screen w-[232px] flex-shrink-0 flex-col border-r border-border bg-white">
      {/* Logo 区域 */}
      <div className="flex h-14 items-center border-b border-border px-6">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-neutral-950">
            <AppIcon size={14} className="text-white" />
          </div>
          <span className="text-[23px] font-semibold leading-none tracking-[-0.92px] text-neutral-950">
            中医 APP
          </span>
        </div>
      </div>

      {/* 菜单区域 */}
      <div className="flex-1 overflow-y-auto p-2">
        {MENU_GROUPS.map((group, groupIndex) => {
          const isExpanded = expandedGroups.includes(group.label)
          const firstItem = group.items[0]
          const restItems = group.items.slice(1)

          return (
            <div className="mb-1" key={group.label}>
              <div className="px-4 pb-1 pt-4 text-xs leading-5 text-black/40">
                {group.label}
              </div>
              {group.expandable ? (
                <>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    disabled={firstItem.disabled}
                    className={cn(
                      "flex w-full items-center gap-2 rounded px-4 py-1.5 text-sm text-neutral-950/90 hover:bg-neutral-950/5",
                      firstItem.disabled && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    {groupIndex === 0 ? (
                      <AppIcon size={20} />
                    ) : (
                      <UserIcon size={20} />
                    )}
                    <span className="flex-1 text-left">{firstItem.label}</span>
                    {isExpanded ? (
                      <ChevronUpIcon size={16} />
                    ) : (
                      <ChevronDownIcon size={16} />
                    )}
                  </button>
                  {isExpanded &&
                    restItems.map((item) => {
                      const isActive = item.to && activePath === item.to
                      return (
                        <button
                          key={item.label}
                          type="button"
                          disabled={item.disabled}
                          onClick={() => item.to && navigate({ to: item.to })}
                          className={cn(
                            "block w-full rounded px-4 py-1.5 pl-11 text-left text-sm text-neutral-950/60 hover:bg-neutral-950/5",
                            isActive && "bg-brand-light text-brand",
                            item.disabled && "opacity-40 cursor-not-allowed"
                          )}
                        >
                          {item.label}
                        </button>
                      )
                    })}
                </>
              ) : (
                group.items.map((item) => {
                  const isActive = item.to && activePath === item.to
                  const itemKey = `${group.label}-${item.label}`
                  const hasChildren = (item.children?.length ?? 0) > 0
                  const isItemExpanded = expandedItems.includes(itemKey)
                  return (
                    <div key={item.label} className="space-y-1">
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
                        <ViewListIcon size={20} />
                        <span className="flex-1 text-left">{item.label}</span>
                        {hasChildren ? (
                          isItemExpanded ? (
                            <ChevronUpIcon size={16} />
                          ) : (
                            <ChevronDownIcon size={16} />
                          )
                        ) : null}
                      </button>
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
                })
              )}
            </div>
          )
        })}
      </div>

      {/* 底部操作区 */}
      <div className="border-t border-border p-4">
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded hover:bg-neutral-950/5"
        >
          <ViewListIcon size={16} />
        </button>
      </div>
    </aside>
  )
}
