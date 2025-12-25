# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev       # Start development server
pnpm build     # Type check and build for production
pnpm lint      # Run ESLint
pnpm preview   # Preview production build
```

## Architecture

This is a React admin dashboard for healthcare management, built with:
- **React 19** with React Compiler (babel-plugin-react-compiler)
- **TanStack Router** for file-based routing with auto code-splitting
- **TDesign React** as the UI component library
- **Zustand** for state management (persisted to localStorage)
- **Tailwind CSS** for styling
- **Easemob Chat UIKit** for IM and video call integration

### Path Alias
Use `~/` to import from `src/` (e.g., `import { useHerbStore } from "~/hooks/useStore"`)

### Routing Structure
Routes use TanStack Router's file-based convention in `src/routes/`:
- `__root.tsx` - Root layout
- `_anon/` - Anonymous routes (login/auth)
- `_herb/` - Protected routes requiring authentication (layout includes Navigator and Provider)

Route files export `Route` created with `createFileRoute()`.

### State Management
`useHerbStore` (src/hooks/useStore.tsx) manages session state including `accessToken` and Easemob credentials. Protected routes check `accessToken` in `beforeLoad`.

### API Layer
- `request()` function (src/hooks/useRequest.ts) wraps axios with auth headers and standard error handling
- `useRequest` hook wraps ahooks' useRequest with error toast notifications
- Services in `src/services/` define API calls with Zod schemas for validation

### CRUD Pattern
The `SchemaCrud` component (src/components/schema-crud.tsx) provides a declarative pattern for CRUD pages:
- Define `searchSchema`, `tableSchema`, `formSchema` as field configurations
- Pass CRUD operations (`list`, `create`, `update`, `remove`, `detail`)
- Handles pagination, form validation, drawer UI automatically

Schema types:
- `FieldSchema` - Form field definition (component type, validation, options)
- `TableFieldSchema<T>` - Table column definition with optional custom render

### Widget Layer
`src/widgets/` contains third-party integration components:
- `Provider` wraps Easemob UIKitProvider with auth credentials
- `CallKitProvider` handles video/audio call UI
- `Navigator` is the sidebar navigation

## Code Conventions

- Chinese is used for UI labels and messages
- TDesign component imports from `tdesign-react`
- Use `cn()` from `~/libs/utils` for conditional classNames (clsx + tailwind-merge)
