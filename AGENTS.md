# AGENTS.md

## 项目概览

- `herb-admin`：董奉堂中医问诊管理系统（Web 管理端 / 运营后台）。
- 技术栈：React 19 + TypeScript 5 + Vite（rolldown-vite）+ TanStack Router（文件路由）+ TDesign React + Tailwind CSS + Zustand + axios/ahooks + Zod。
- 主要模块（按路由/组件大致划分）：
  - 登录与会话：`src/routes/_anon/auth/route.tsx`、`src/hooks/useStore.tsx`、`src/services/auth.ts`
  - 受保护后台布局：`src/routes/_herb/route.tsx`（鉴权 + Navigator + Easemob Provider）
  - 工作台/IM：`src/routes/_herb/dashboard/route.tsx`、`src/widgets/provider.tsx`
  - CRUD/配置页：`src/routes/_herb/employees/route.tsx`、`src/routes/_herb/users/route.tsx`、`src/routes/_herb/packages/route.tsx` 等

> 额外参考：`CLAUDE.md`、`docs/TASK.md`。

## 常用命令（pnpm）

- 安装依赖：`pnpm install`
- 启动开发：`pnpm dev`
- 生产构建（含类型检查）：`pnpm build`
- 代码检查：`pnpm lint`
- 预览构建产物：`pnpm preview`
- 更新 OpenAPI 文档快照：`pnpm update:api-docs`（会下载到 `docs/dft-api-docs.json`）

## 目录结构速览

- `src/main.tsx`：应用入口（`ReactDOM.createRoot` + `RouterProvider`）。
- `src/routes/`：TanStack Router 文件路由（`createFileRoute`）。
  - `src/routes/__root.tsx`：根布局。
  - `src/routes/_anon/`：匿名/未登录页面（如登录）。
  - `src/routes/_herb/`：已登录页面（后台布局 + 业务页面）。
- `src/hooks/`：自定义 hooks（如 `useStore`, `useRequest`）。
- `src/services/`：接口封装（通常配套 Zod schema 校验）。
- `src/stores/`：领域状态（Zustand）。
- `src/components/`：通用组件（`SchemaCrud`, `SchemaForm` 等）。
- `src/widgets/`：三方集成组件（Easemob Provider/CallKit、导航等）。
- `src/libs/`：工具函数与常量（`cn()`, `BASE_URL` 等）。

## 代码风格与约定

- TypeScript：开启严格模式（`tsconfig.json` / `tsconfig.app.json`）。尽量不要引入 `any`；优先用 Zod + `z.infer` 推导类型。
- 格式：TS/TSX 文件里普遍使用**双引号**与**不写分号**；不同文件可能存在差异（例如部分配置文件使用单引号），请以“就近文件风格”为准。
- `import type`：类型导入优先使用 `import type { ... } from ...`。
- 路径别名：使用 `~/` 指向 `src/`（见 `vite.config.ts`、`tsconfig*.json`），避免深层相对路径。
- UI 文案：现有页面主要使用中文提示/标签；Toast 通常用 `MessagePlugin.*`。

## 路由约定（TanStack Router）

- 每个路由文件导出：`export const Route = createFileRoute("...")({ ... })`，文件名一般为 `route.tsx`。
- 鉴权：`src/routes/_herb/route.tsx` 的 `beforeLoad` 会检查会话字段（如 `accessToken`/Easemob 凭证），失败会 `redirect` 到 `/auth`。
- 根路径跳转：`src/routes/index.tsx` 会在 `/` 根据登录态跳转到 `/auth` 或 `/dashboard`。

## API / Service 约定

- 请求统一走：`src/hooks/useRequest.ts` 的 `request<T, U>(url, method, body)`。
  - 会自动注入 `Authorization: Bearer <token>`。
  - 若响应形如 `{ code, msg, data }` 且 `code !== 200`，会抛错。
- `src/services/` 下的接口建议遵循：
  - 为请求/响应建立 Zod schema
  - 用 `schema.parse(data)` 做运行时校验
  - 用 `z.infer<typeof schema>` 导出类型
- `useRequest`（ahooks wrapper）会在 `onError` 里统一弹出 `MessagePlugin.error`。

## 状态管理（Zustand）

- 会话：`src/hooks/useStore.tsx` 的 `useHerbStore`（persist 到 localStorage，key 为 `herb`）。
- 业务状态：`src/stores/*`，通常用 `createWithEqualityFn` + action 方法。
- 读取状态优先用 selector：`useHerbStore((s) => s.accessToken)`；仅在非 React 生命周期内才使用 `getState()`。

## UI / 样式

- UI 组件库：优先使用 `tdesign-react` 与 `tdesign-icons-react`。
- 样式：Tailwind CSS，颜色/阴影/圆角等 Token 见 `tailwind.config.js`。
- className 合并：使用 `cn()`（`src/libs/utils.ts`，clsx + tailwind-merge）。

## 生成文件与边界（重要）

- 🚫 不要手改 `src/routeTree.gen.ts`（TanStack Router 插件生成）。
- 🚫 不要手改 `dist/`（构建产物）。
- ⚠️ `docs/dft-api-docs.json` 由 `pnpm update:api-docs` 生成/更新。
- ⚠️ 不要把敏感信息提交到仓库（例如 `.env*`、密钥、账号密码等）。

## 修改后的自检建议

- 只改必要范围，保持 PR/变更集聚焦。
- 改动 TS/TSX 后优先跑：`pnpm lint`，必要时再跑：`pnpm build`。
- 涉及路由/鉴权/会话的改动，至少手动验证：
  - 未登录访问 `/`、`/_herb/*` 会被重定向到 `/auth`
  - 登录成功后跳转 `/dashboard` 正常
  - 退出登录会清理会话并回到 `/auth`

## 接口文档

- https://s.apifox.cn/5ca0e407-9869-4006-9f02-24964c24a5c2/399645524e0
- https://open.yhcheng.pub/dft/swagger-ui/index.html#/
- 优先使用 apifox 的接口文档，其次使用 openapi 的接口文档，最后使用 swagger 的接口文档。

## 设计图

- https://www.figma.com/design/U69A5FVg8AksuQkxDO4F6F/%E4%B8%AD%E5%8C%BB%E7%AE%A1%E7%90%86%E7%AB%AF--Copy-?node-id=23187-9509&p=f&t=J5zInVqmO2JgUcsD-0
