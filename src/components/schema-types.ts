import type { ReactNode } from "react"
import type { TableProps, TableRowData } from "tdesign-react"

export interface FieldSchema {
  name: string
  label: string
  component?: "input" | "select" | "textarea" | "password"
  placeholder?: string
  options?: { label: string; value: string | number }[]
  required?: boolean
  props?: Record<string, unknown>
  formItemClassName?: string
}

export interface TableFieldSchema<T> {
  colKey: string
  title: string
  width?: number
  className?: string
  fixed?: "left" | "right"
  ellipsis?: boolean
  render?: (row: T) => ReactNode
}

export const buildTableColumns = <T extends TableRowData>(
  schema: TableFieldSchema<T>[]
): NonNullable<TableProps<T>["columns"]> =>
  schema.map((field) => ({
    colKey: field.colKey,
    title: field.title,
    width: field.width,
    className: field.className,
    ellipsis: field.ellipsis,
    fixed: field.fixed,
    cell: field.render
      ? ({ row }: { row: T }) => field.render!(row)
      : undefined,
  }))
