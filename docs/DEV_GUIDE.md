## 董奉堂中医问诊管理系统开发指引

### 1. 概览

本指引基于 `docs/TASK.md` 需求与 Figma 设计节点 `624-2910`（“中醫APP 展示”）总结。目标是在 Web 管理端以 React 18 + Vite + TDesign + TanStack Router + Zustand + axios/ahooks useRequest 实现一套可扩展的接诊运营系统。

### 2. 参考资料

- 设计稿：`https://www.figma.com/design/zlHeCNicdVIIoHXjrsf5Fo/...&node-id=624-2910`
- 后端 API：`https://open.yhcheng.pub/dft/swagger-ui/index.html#/`
- UI 组件库：`https://tdesign.tencent.com/`

### 3. 模块化架构

| 层级 | 说明 |
| --- | --- |
| apps/admin | Vite + React 主应用，负责路由、布局、权限守卫。 |
| packages/ui | 对 TDesign 组件的业务化封装（表格、表单、弹窗、状态标签、菜单等），统一主题 Token。 |
| packages/state | Zustand slices：`patientSlice`、`scheduleSlice`、`prescriptionSlice`、`inventorySlice`、`authSlice`。 |
| packages/services | axios 实例、拦截器与由 OpenAPI 生成的 DTO/类型（推荐 `openapi-typescript` 生成 `~/services/types.ts`）。 |
| packages/hooks | 基于 ahooks/useRequest 的数据 hook（如 `usePatientList`, `useAppointmentDetail`），负责缓存、轮询、退避。 |

### 4. 核心功能拆解

| 模块 | 前端视图 | 关键交互 | 主要接口 |
| --- | --- | --- | --- |
| 患者档案 | 卡片式列表 + 详情侧栏 | 条件筛选、标签管理、导入导出 | `/patients`, `/patients/{id}`, `/patients/import` |
| 预约与排班 | 日历视图、医生排班表 | 拖拽调整时段、冲突校验、提醒设置 | `/schedules`, `/appointments`, `/notifications` |
| 接诊工作台 | 多标签页病历 + 处方面板 | 病历模板、症状录入、处方联动库存 | `/consultations`, `/prescriptions`, `/pharmacy/stocks` |
| 药材库存 | 表格 + 批次详情 | 入库/出库记录、盘点、预警 | `/inventory/items`, `/inventory/batches`, `/inventory/audit` |
| 财务结算 | 票据列表 + 结算面板 | 支持挂账/储值/医保、打印凭证 | `/billing/orders`, `/billing/payments` |
| 统计看板 | KPI 卡片 + 趋势图 | 门店/医生/时间筛选、导出 | `/analytics/overview`, `/analytics/kpi` |
| 权限与审计 | 角色树 + 菜单配置 | 权限粒度分配、日志查询 | `/auth/roles`, `/auth/permissions`, `/audit/logs` |

### 5. UI 说明（Figma 节点 624-2910）

- 框架：宽 1160px 内容容器，顶部为搜索/操作区，左侧为导航菜单（带图标、折叠状态）。
- 常用组件：TDesign Button/Tag/Table/Input/Checkbox/Pagination 对应 Figma component set `764:*` 系列，需统一映射。
- 列表卡片：Figma 数据展示“预约/患者卡”包含头像、状态标签、右侧操作按钮（视频/电话/更多），在组件封装中需提供 props 设置左右操作。
- 表单：`layout_G7ZKJL` 表示表单容器 padding 32px、列间距 10px；表单项配合 `Form.Item` + Zod schema 做即时校验。
- 交互状态：设计提供多状态组件（primary/default/outline、success/danger Tags、菜单 hover/selected），需映射到主题 token（`brand`, `success`, `warning`, `danger`）。
- 响应式：主要在 ≥1280px 展示，内部使用 `grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))` 实现卡片自适应。

### 6. 数据与状态

- 全局：`authSlice` 保存 token、门店信息；`layoutSlice` 管理侧边栏折叠、主题模式。
- 业务：各模块 slice 按领域命名，暴露 selector 与 action：`setPatients`, `updateAppointment`, `syncInventoryWarning` 等。
- 数据获取：`~/services/http.ts` 导出 axios 实例，拦截器附带门店/操作人；`useRequest` 统一封装（`useApiRequest<T>`）以处理 loading、error、retry。
- 模型：所有请求/响应通过 Zod schema + `z.infer` 转 TS 类型，如 `PatientSchema`, `AppointmentSchema`，同时用于表单验证。

### 7. 接口集成策略

1. 自动生成 types：运行 `npx openapi-typescript https://open.yhcheng.pub/dft/v3/api-docs -o packages/services/types.ts`。
2. 服务层：每个领域一个 service，如 `patientService.ts`（list/detail/create/update），`inventoryService.ts` 等，内部直接调用 axios 并返回严格类型。
3. 请求约定：所有写接口附带 `operatorId`, `storeId`, `timestamp`；错误统一走 `~/utils/notifyError`，并向 Sentry 上报。
4. 权限：在路由和组件级别使用 `usePermission` hook，基于 `authSlice.permissions` 判断按钮/菜单是否展示。

### 8. 非功能要求

- 性能：首屏 bundle < 300KB（gzip），启用路由懒加载和 `@loadable/component`；列表使用虚拟滚动或服务端分页。
- 安全：Axios 拦截器处理 token 失效，自动跳转登录；敏感字段前端脱敏，导出文件加入水印与审计记录。
- 监控：集成 Sentry（性能 + 错误）、Web Vitals 上报；关键接口成功率 ≥ 99%，失败时记录请求参数（脱敏）。

### 9. 开发流程

1. 初始化：`pnpm install` → `pnpm dev`；配置 `~/.env.local`（API_BASE_URL、SENTRY_DSN 等）。
2. 目录规范：`src/modules/<domain>` 包含 `routes.tsx`, `components`, `hooks`, `stores`。
3. 代码风格：ESLint + Prettier（2 空格、单引号、尾随逗号），禁止 `any`，优先 `const`。
4. 测试：关键组件/函数编写 Vitest，复杂流程提供 Playwright 用例或手动验证记录。

### 10. 交付检查

- 功能：预约/接诊/处方/库存全流程自测（含异常路径），提交测试报告。
- 文档：更新 `docs/TASK.md`、API 对接说明、部署指南、权限矩阵。
- 验收：KPIs（预约转化率、接诊用时、处方一致性、接口成功率）具备可观测数据；监控与日志上线可写。

> 若后续需要扩展移动端或新增外部系统集成，应保持上述模块划分与接口约定，新增包或模块即可，无需大规模重构。

### 11. 模块任务清单

以下任务拆解基于 Figma 节点 `624-2910` 与 OpenAPI 文档，所有模块均遵循 React + TDesign + TanStack Router + Zustand + ahooks useRequest + Zod 组合；任何代码改动需同步更新本节内容以保持一致性。

#### 11.0 用户登录与会话管理

- **目标**：提供账号/密码与验证码登录、会话维持、权限同步与登录日志。
- **UI/交互要点**：`/auth`（`/_anon/auth`) 路由复刻 `764:37999`，使用 Tailwind  + Screen 组件构建表单/背景；支持“记住账号”“忘记密码”提示，表单使用 Zod 做即时校验。
- **数据与 API**：`POST /dft/login`（帐号密码登录，`LoginBody`）、`POST /dft/smsLogin`、`/dft/sys-sms`, `/dft/sys-register`, `/dft/app/user/password/*`。登录成功后调用 `/auth/roles`、`/auth/permissions` 同步权限。
- **状态/逻辑**：`src/hooks/useStore.tsx` 通过 Zustand + persist 保存 `{ accessToken, hxUserName, hxPassword, hxUuid }`，并暴露 `setSession/resetSession`。记住账号写入 `localStorage` (`herb:last-account`)；Root Layout 仅呈现“控制台 + 退出登录”。403/401 由 `useRequest` Notification 冷静提示。
- **任务拆解现状**：
  1. 账号密码登录已就绪，`src/services/auth.ts` 使用 Zod 校验请求与响应，`src/routes/_anon/auth/route.tsx` 负责 Tailwind UI；剩余短信登录、验证码计时器及安全日志待实现。
  2. Axios 拦截器含 token 注入（`useRequest` 中的 Authorization header）；刷新 token/锁定策略仍需在后续安全优化中补齐。
  3. 登录成功写入会话并重定向 `/dashboard`（或 search.redirect）；`/`、`/_hreb` beforeLoad 负责保护业务路由。
  4. 权限菜单加载逻辑尚未实现，需要在权限模块落地后补齐。
- **验收/测试**：
  - 正常登录、登出、未登录访问业务路由被重定向；
  - token 失效自动重登（TODO）；
  - 无权限访问路径被拦截并提示（依赖权限模块）；
  - 登录失败计数、锁定与日志记录（TODO）。

#### 11.1 预约排班模块

- **目标**：提供医生/日期切换、日/周视图排班、预约创建编辑、冲突校验与提醒。
- **UI/交互要点**：参照 Figma 中顶部 KPI + 列表卡 layout，Calendar 卡片使用 `ScheduleBoard` 组件封装拖拽、Tooltip、状态标签��文字色取 `Brand` token）。
- **数据与 API**：
  - 列表：`GET /dft/backend/consultation/list`（支持 doctorId/status/date range），分页参数由 `useRequest` 管理。
  - 预约详情：若存在 `/appointments/{id}` 接口，统一封装到 `appointmentService`；若无则组合 `consultation/detail` + `qtn/detail`。
  - 通知：重用短信接口 `/dft/sys-sms/...`（Swagger tag `sys-sms-controller`）。
- **状态/逻辑**：`scheduleSlice` 持有 `{ selectedDoctorId, selectedDateRange, schedules[], appointments[] }`，提供 `syncSchedules`, `createAppointment`, `updateSlotStatus` action；所有写接口 payload 增加 `operatorId/storeId/timestamp`。
- **任务拆解**：
  1. 新增 `/appointments` 懒加载路由与 `RouteGuard`（鉴权 + 权限 `appointments:view`）。
  2. 构建 `ScheduleBoard`（Calendar + 拖拽）并封装单元格渲染，冲突提示用 TDesign `MessagePlugin.error`。
  3. 实现预约表单（患者、医生、时间段、提醒配置），Zod Schema 校验并集成短信开关。
  4. 预约成功后触发 `scheduleSlice` refresh + 操作日志写入 `/audit/logs`。
- **验收/测试**：
  - 单元测试：`scheduleSlice` reducer 与冲突校验函数。
  - 手动/自动：Playwright 覆盖预约创建、拖拽调班、冲突提示；接口失败模拟检查降级提示。

#### 11.2 接诊工作台模块

- **目标**：医生在单页完成病历查看、诊疗记录、处方调整与库存联动。
- **UI/交互要点**：沿用 Figma 左侧待诊列表 + 右侧标签页布局；处方面板遵循组件 `componentSet 764:4583`（Button）与 `layout_G7ZKJL`（表单）规范。
- **数据与 API**：
  - 查询：`GET /dft/backend/consultation/detail/{id}`；历史列表来自 `/dft/backend/consultation/list`。
  - 编辑：`POST /dft/backend/consultation/edit`（备注、诊疗建议、处方选项）。
  - 库存：`GET /inventory/items`、`GET /inventory/batches`（如 API 缺失需与后端确认）。
- **状态/逻辑**：`consultationSlice` 维护 `{ activeConsultation, tabs[], draftChanges, prescriptionItems[] }`，支持 `saveDraft`, `applyTemplate`, `syncInventoryFlag`。引入 `useUnsavedChanges` hook 管理离开提示。
- **任务拆解**：
  1. `/consultations/:id` 路由与 `ConsultationLayout` 组件（左 list + 右内容）。
  2. `useConsultationDetail` hook（含加载、错误、重试），数据经 Zod schema 转换。
  3. 病历 + 处方表单组件化（`ClinicalForm`, `PrescriptionEditor`），联动库存校验、剂量计算、模板复用。
  4. 保存/提交逻辑（含 Loading、Sentry 上报），失败时保留本地草稿。
- **验收/测试**：
  - 单元：剂量计算、库存校验函数。
  - 集成：操作流（查看→编辑→保存→切换患者）全链路通过；未保存退出弹窗准确。

#### 11.3 药材库存与配药模块

- **目标**：提供库存监控、批次详情、配药与预警能力。
- **UI/交互要点**：表格 + Tag 状态标记（库存预警、批次过期），批次抽屉在右侧滑出，操作按钮遵循 Figma 行操作布局。
- **数据与 API**：`GET /inventory/items`、`GET /inventory/batches/{id}`、`POST /pharmacy/dispense`、`POST /inventory/audit/export`（若无，需补充接口）。
- **状态/逻辑**：`inventorySlice` 存储 `{ filters, list, pagination, warnings[] }`，`useInventoryList` 负责请求；配药时调用 `dispense` 并触发 `syncInventory`。
- **任务拆解**：
  1. `/inventory` 路由 + `InventoryLayout`，含筛选表单、表格、批次抽屉。
  2. 导出/盘点按钮 -> service 封装，导出记录写 `/audit/logs`。
  3. 配药面板（与接诊处方共享组件），完成库存扣减及日志。
  4. 阈值配置 UI（Modal）+ `inventorySlice` 中 `warningThreshold`，触发通知。
- **验收/测试**：
  - 表格筛选/分页/导出功能测试。
  - 配药扣减库存 E2E 流程（含失败回滚）。
  - 低库存提醒出现在列表与 Dashboard。

#### 11.4 财务结算与账务模块

- **目标**：完成收费单、票据、挂账管理及多支付方式结算。
- **UI/交互要点**：Figma 中 KPI + 表格 + 右侧结算抽屉；支付方式按钮使用 TDesign Segment + 输入框组合。
- **数据与 API**：`GET /billing/orders`、`GET /billing/payments`, `POST /billing/orders`, `POST /billing/payments/settle`, 文件下载接口（票据/报表）。
- **状态/逻辑**：`billingSlice` 维护订单列表、当前结算草稿、支付方式配置；`useBillingList` + `useSettlement` hooks 管理流程。
- **任务拆解**：
  1. `/billing` 路由设计：列表页 + 结算抽屉 + 挂账管理标签。
  2. 构建结算表单（金额校验、医保/商保/储值组合），Zod 校验“本次应收=各支付方式之和”。
  3. 票据打印、导出功能（下载文件 + 前端打印模板）。
  4. 对账报表导出，操作写审计日志并附水印。
- **验收/测试**：
  - 不同支付方式组合计算正确；
  - 权限不足用户无法点击导出；
  - 票据/报表文件完整、字段准确。

#### 11.5 统计看板与监控模块

- **目标**：可视化展示预约转化、接诊量、药材消耗、医生绩效与接口成功率。
- **UI/交互要点**：Figma KPI 卡 + 折线/柱状图布局，筛选面板位于顶部右侧（时间、门店、医生）。
- **数据与 API**：`GET /analytics/overview`, `/analytics/kpi`, 监控数据来自 Sentry/Web Vitals（自建 API `/monitoring/metrics`）。
- **状态/逻辑**：`analyticsSlice` 保存 `{ filters, kpis, charts, monitoring }`，`useAnalyticsKpi`、`useMonitoringMetrics` 双 hook；数据缓存 5 分钟。
- **任务拆解**：
  1. `/analytics` 路由：KPIGrid + ChartsSection 组件。
  2. 集成 Sentry 与 Web Vitals，上报后端并在看板展示接口成功率/性能指标。
  3. 导出功能：图表截图（Canvas 导出）与数据 CSV。
- **验收/测试**：
  - 筛选条件生效，图表刷新；
  - 模拟接口失败时 UI 告警；
  - 监控指标显示最近 24h 数据。

#### 11.6 权限与审计模块

- **目标**：管理角色-菜单-接口权限并提供操作日志审计。
- **UI/交互要点**：Figma 左侧菜单树 + 右侧权限矩阵；日志列表使用 Table + Filter。
- **数据与 API**：`GET/POST /auth/roles`, `/auth/permissions`, `/audit/logs`; 登录相关 `/sys-login-controller` 维持 token。
- **状态/逻辑**：`authSlice` 扩展 `roles`, `permissions`, `currentRole`; `usePermission` hook 在组件层判断；写操作统一附 `operatorId/storeId/timestamp`。
- **任务拆解**：
  1. `/settings/permissions` 路由 + 角色树组件（支持增删改）。
  2. 权限矩阵（checkbox）批量保存 API；结果写入状态并刷新 `usePermission` 缓存。
  3. 审计日志页：筛选（用户、操作类型、时间）、导出 CSV、水印。
  4. 全局 `PermissionGuard` 组件封装按钮禁用与提示逻辑。
- **验收/测试**：
  - 新增/编辑角色权限后即时生效；
  - 无权限用户访问受限路由/按钮被拒绝并提示；
  - 日志筛选、导出准确。
