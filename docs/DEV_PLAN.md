## 董奉堂管理系统开发计划（含 Figma 映射）

> 说明：当前仅成功解析节点 `764:37999 (7.Login/1.Account-Login)` 与 `764:40494`/`764:40673 (3.Form(Light)/2.Step Form)`；其余节点因 Figma API 429 限流暂不可访问，待限流解除后需继续补充截图/命名并同步本计划。以下各模块均要求开发完成后同步更新 `docs/DEV_GUIDE.md` 与本文件，确保文档与代码一致。

### 0. 登录与会话管理
- **Figma 节点**：`764:37999`（账号密码登录）、`764:38081` 等登录变体（待解析）。
- **API**：`POST /dft/sys-login`、`POST /dft/sys-sms/*`、`POST /dft/sys-register`、`POST /dft/app/user/password/*`、`GET /auth/roles`、`GET /auth/permissions`。
- **任务**：
  1. 构建账号/验证码登录表单（TDesign Form + Zod），复刻 `764:37999` 视觉，包括“记住账号”“短信登录”“注册”入口。
  2. 编写 `authService`（登录/登出/刷新 token），`authSlice` 存储 `{token, refreshToken, storeId, roles, permissions, expiresAt}` 并集成 Zustand 持久化。
  3. Axios 拦截器接入 token 续期与 401 处理；失败 5 次锁定账号并记录 `/audit/logs`。
  4. 登录成功后拉取权限菜单，驱动 `PermissionGuard` 与左侧导航。
- **验收**：登录/登出/失效重登流程完整；非法凭据提示；权限下发后导航刷新。

### 1. 全局布局与导航（后台壳层）
- **Figma 节点**：`764:40494`、`764:40673`（包含 header、左侧导航，菜单项含“预约管理”“用户管理”“药材管理”“员工管理”“个人页”）。其余布局节点 `764:40876`、`764:41328` 等待解除限流后补充。
- **API**：无直接接口，但依赖 `authSlice` 与 `GET /auth/permissions`。
- **任务**：
  1. 实现壳层布局（header + sidebar + content）组件，复刻节点样式（灰底、白色卡片、菜单组标题等）。
  2. 将导航项配置化（JSON + 权限码），支持折叠、高亮、分组标签（管理员/更多等）。
  3. Header 集成功能入口（搜索、用户信息、设置），联动 `authSlice`。
- **验收**：导航与 header 样式一致；权限不同的账号展示不同菜单；路由切换保持滚动与面包屑正确。

### 2. 预约与排班管理
- **Figma 节点**：引用 `Menu › 预约管理` 对应的内容帧（IDs `764:40876`、`764:41328` 等待解析）。
- **API**：`GET /dft/backend/consultation/list`、`GET /dft/app/qtn/list`、`POST /appointments/*`（若后端提供）、`POST /notifications/sms`。
- **任务**：
  1. `/appointments` 路由 + 懒加载模块，使用 Calendar + Cards 呈现日/周视图。
  2. `scheduleSlice` + `useAppointmentList` hook 调 `consultation/list`，支持医生/状态/时间筛选。
  3. 预约表单（含短信提醒、冲突校验）复刻 Figma 表单布局；提交后刷新日历。
  4. 拖拽调班交互（react-beautiful-dnd 或同类）+ 冲突提示。
- **验收**：医生/日期切换、拖拽调班、提醒生效、冲突提示；接口失败时降级提示。

### 3. 接诊工作台
- **Figma 节点**：`Menu › 预约管理` 内容中的右侧多标签面板（同样位于 `764:40494` 派生帧，后续需解析列表 ID）。
- **API**：`GET /dft/backend/consultation/detail/{id}`、`POST /dft/backend/consultation/edit`、`GET /inventory/items`、`POST /pharmacy/dispense`。
- **任务**：
  1. `/consultations/:id` 子路由，左侧候诊列表 + 右侧病历/处方标签页组件。
  2. `consultationSlice` 管理当前问诊、历史记录、草稿；`useConsultationDetail` hook 负责数据获取与 Zod 校验。
  3. 处方编辑联动库存接口，剂量/付数计算，库存不足提示（Tag + Toast）。
  4. 未保存退出确认、Sentry 上报、失败保留草稿。
- **验收**：查看/编辑/保存/切换流程完整；库存警告准确；未保存提示。

### 4. 用户 & 员工管理
- **Figma 节点**：`Menu` 中“用户管理”“个人页”“管理员 › 员工管理”项（节点 `764:40494`/`764:40673` 内部）。具体列表帧 `764:41102`、`764:41535` 等待解析。
- **API**：`GET /dft/app/user/detail`、`GET /dft/app/user/detail/{id}`、`POST /dft/app/user/password/*`、`GET /dft/backend/employee/*`、`POST /dft/backend/employee/*`（若 Swagger 提供）
- **任务**：
  1. 构建用户列表（筛选、分页、导出）+ 详情抽屉，字段映射 Swagger DTO。
  2. 员工管理（角色、门店、状态）+ 批量导入模板；与权限模块联动。
  3. 个人页/资料卡视图复刻 Figma 设计（头像、操作按钮）。
  4. 若需部门管理：暂未在 Figma 中找到对应帧，待设计补充；先实现数据层接口（`/auth/departments` 等）与空状态。
- **验收**：增删改查流程、导入导出、权限控制；部门功能待设计确认。

### 5. 药材库存与配药
- **Figma 节点**：`Menu › 药材管理` 内容帧（IDs `764:38834`、`764:39736` 等待解析）。
- **API**：`GET /inventory/items`、`GET /inventory/batches/{id}`、`POST /pharmacy/dispense`、`POST /inventory/audit/export`。
- **任务**：
  1. `/inventory` 路由，表格 + 批次抽屉 + 盘点/导出按钮（TDesign Table + Pagination）。
  2. `inventorySlice` + `useInventoryList` hook，支持分类、状态、关键字筛选；导出写 `/audit/logs`。
  3. 配药流程与接诊处方复用组件，扣减库存、记录操作人、阈值预警。
- **验收**：筛选、分页、导出、配药扣减联动；低库存 Tag 提示。

### 6. 财务结算与账务
- **Figma 节点**：待解析（可能为 `764:39901`、`764:40048` 等票据列表帧）。
- **API**：`GET /billing/orders`、`GET /billing/payments`、`POST /billing/orders`、`POST /billing/payments/settle`、票据下载接口。
- **任务**：
  1. `/billing` 路由，列表 + 结算抽屉 + 挂账标签，复刻 KPI + 表格布局。
  2. 组合支付校验（医保/商保/储值）与票据打印/导出权限控制。
  3. 对账报表导出、日志记录、导出文件加水印。
- **验收**：金额校验准确；票据/报表导出成功且权限可控。

### 7. 统计看板与监控
- **Figma 节点**：推测为 `764:40345`、`764:39278` 等 KPI 帧（待解析）。
- **API**：`GET /analytics/overview`、`GET /analytics/kpi`、`GET /monitoring/metrics`（自建）
- **任务**：
  1. `/analytics` 路由，KPI 卡 + 折线/柱状图；筛选条件（门店、时间、医生）。
  2. 集成 Sentry/Web Vitals 数据，在看板显示接口成功率、性能指标。
  3. 图表截图/CSV 导出。
- **验收**：筛选刷新；监控指标展示；导出功能可用。

### 8. 权限与审计
- **Figma 节点**：`Menu` 中“管理员 › 员工管理”同区域 + 右侧权限表格帧（IDs `764:39589`、`764:38267` 等待解析）。
- **API**：`GET/POST /auth/roles`、`GET/POST /auth/permissions`、`GET /audit/logs`。
- **任务**：
  1. `/settings/permissions` 路由，角色树 + 权限矩阵复刻 Figma 布局；批量保存。
  2. 全局 `PermissionGuard` 控制按钮显示；所有写接口带 `operatorId/storeId/timestamp`。
  3. 审计日志筛选、导出、水印；与登录/导出等操作联动。
- **验收**：权限修改即时生效；无权限访问被拦截；日志过滤/导出准确。

### 9. 其他模块 & 待补充节点
- Figma 节点 `764:40876`、`764:41328`、`764:41102`、`764:38081`、`764:38406`、`764:38987`、`764:38688`、`764:41706`、`764:40204`、`764:41535`、`764:39589`、`764:38267`、`764:38834`、`764:38539`、`764:39736`、`764:39901`、`764:40048`、`764:40345`、`764:39278`、`764:39125`、`764:39442` 暂因 Figma 限流无法解析。请在 API 限制解除后：
  1. 逐个获取节点名称/截图，补充到本计划的“Figma 节点”条目；
  2. 若发现新增功能（如部门管理、问卷等），在 `docs/DEV_GUIDE.md` 与本文件中追加模块说明与任务；
  3. 同步输出 `功能 ↔ 设计` 映射表（可附截图链接）。

### 10. 提交与同步要求
- 任意模块开发完成后，需在 PR 中更新 `docs/DEV_GUIDE.md` 和本计划对应章节，记录使用的 Figma 节点、接口和验收结论。
- 若新增/调整 Figma 节点，请补充节点 ID 与说明，保持“功能-设计-接口”三位一体。
- 所有模块上线前需勾选：接口联调日志、Sentry/监控验证、手动或自动化验证记录。
