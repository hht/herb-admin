import type { ReactNode } from "react"
import { Form, Input, Select, Textarea } from "tdesign-react"
import type { FormProps } from "tdesign-react"

import { cn } from "~/libs/utils"

import type { FieldSchema } from "./schema-types"

interface SchemaFormProps {
  form: FormProps["form"]
  schema: FieldSchema[]
  layout?: "vertical" | "inline"
  colon?: boolean
  className?: string
  actions?: ReactNode
  actionsAlign?: "start" | "end"
}

const renderField = (field: FieldSchema) => {
  const commonProps = {
    placeholder: field.placeholder,
    ...(field.props ?? {}),
  }

  switch (field.component) {
    case "select":
      return <Select options={field.options} {...commonProps} />
    case "textarea":
      return <Textarea {...commonProps} />
    case "password":
      return <Input type="password" {...commonProps} />
    default:
      return <Input {...commonProps} />
  }
}

export const SchemaForm = ({
  form,
  schema,
  layout = "vertical",
  colon = true,
  className,
  actions,
  actionsAlign = "start",
}: SchemaFormProps) => {
  return (
    <Form
      form={form}
      layout={layout}
      colon={colon}
      labelAlign="top"
      className={className}
    >
      {schema.map((field) => (
        <Form.FormItem
          key={field.name}
          name={field.name}
          label={field.label}
          className={field.formItemClassName}
          rules={field.required ? [{ required: true, message: `${field.label}不能为空` }] : []}
        >
          {renderField(field)}
        </Form.FormItem>
      ))}
      {actions ? (
        <Form.FormItem className={cn("mt-2", actionsAlign === "end" && "justify-end flex")}> {actions} </Form.FormItem>
      ) : null}
    </Form>
  )
}
