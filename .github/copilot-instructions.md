# AI Coding Agent Instructions

## Project Overview
This is a **Next.js 16 full-stack code editor application** with authentication, real-time collaboration features, and playground management. Built with TypeScript, Tailwind CSS, Radix UI components, and MongoDB/Prisma for data persistence.

## Architecture & Key Patterns

### 1. Authentication & Authorization
- **Provider**: NextAuth v5 with GitHub and Google OAuth (see [auth.config.ts](../auth.config.ts))
- **Adapters**: Prisma adapter syncs OAuth accounts with MongoDB
- **Key File**: [auth.ts](../auth.ts) - sets up handlers, signIn/signOut functions, and callbacks
- **Pattern**: Server-only auth imports via `"server-only"` directive to prevent client-side leaks
- **Middleware**: [middleware.ts](../middleware.ts) enforces route protection and redirects unauthenticated users from `/dashboard`
- **Routes Config**: [routes.ts](../routes.ts) defines public (`[]`), protected (`["/"]`), and auth (`["/auth/sign-in"]`) routes

### 2. Module Architecture (Feature-Based Folders)
Each feature lives in `/modules/<feature>/` with standardized structure:
```
modules/<feature>/
├── types.ts           # TypeScript interfaces (e.g., User, Project interfaces)
├── actions/           # Server actions (marked with "use server")
│   └── index.ts       # All DB operations for this module
├── components/        # Feature-specific React components
│   ├── *-form-client.tsx  # Client components using useFormContext
│   └── *-button.tsx       # Reusable UI components for this feature
└── hooks/             # Custom hooks (e.g., useCurrentUser)
```
Example modules: `auth`, `dashboard`, `home`

### 3. Database & Prisma
- **Provider**: MongoDB (see [schema.prisma](../prisma/schema.prisma))
- **Setup**: `npm run prisma:generate` runs automatically on `postinstall`
- **Key Models**: User (with UserRole enum: ADMIN/USER/PREMIUM_USER), Account, StarMark, Playground
- **Singleton Pattern**: [lib/db.ts](../lib/db.ts) ensures single PrismaClient instance across the app
- **Data Flow**: Actions fetch via Prisma → revalidatePath() invalidates Next.js cache

### 4. UI Component System
- **Source**: Radix UI primitives + custom wrapper in [components/ui/](../components/ui/)
- **Form Handling**: React Hook Form + Zod validation (see [form.tsx](../components/ui/form.tsx))
- **Styling**: Tailwind CSS v4 with class-variance-authority for variants
- **Theming**: next-themes provider in [theme-provider.tsx](../components/ui/providers/theme-providor.tsx) with system/light/dark modes
- **Toasts**: Sonner library for notifications

### 5. Server vs. Client Components
- **Layout Root**: [app/layout.tsx](../app/layout.tsx) is async RSC that fetches session via `auth()` and provides SessionProvider
- **Protected Pages**: Wrap with auth() check in server components; never expose auth in client components
- **Actions**: All DB calls use `"use server"` directive (e.g., [modules/auth/actions/index.ts](../modules/auth/actions/index.ts))
- **Client Forms**: Sign with `"use client"` and use react-hook-form + zod (see [sign-in-form-client.tsx](../modules/auth/components/sign-in-form-client.tsx))

### 6. Next.js App Router Structure
```
app/
├── layout.tsx                  # Root layout with auth & theme providers
├── (auth)/                     # Auth route group (outside main nav)
│   └── auth/sign-in/page.tsx   # Sign-in page
├── (root)/                     # Main route group with header/layout
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page
├── dashboard/
│   └── page.tsx                # Protected dashboard
└── api/auth/[...nextauth]/route.ts  # NextAuth API route
```

## Development Workflows

### Build & Run
```bash
npm run dev                # Start dev server (TurboPackDisabled for stability)
npm run build              # Production build
npm run start              # Start production server
npm run prisma:generate    # Regenerate Prisma client
```

### Key Commands
- **Dev**: `set NEXT_DISABLE_TURBOPACK=1 && next dev` (Windows; Turbopack disabled)
- **Prisma**: Migrations auto-generate on postinstall; adjust schema.prisma then `npm run prisma:generate`

## Code Conventions

### Server Actions
```typescript
// Always at top: "use server"
"use server"
import { currentUser } from "@/modules/auth/actions"
import { revalidatePath } from "next/cache"

export const myAction = async () => {
  const user = await currentUser()
  if (!user) throw new Error("Unauthorized")
  // ... DB operation
  revalidatePath("/path")
  return result
}
```

### Client Components
```typescript
"use client"
import { useCurrentUser } from "@/modules/auth/hooks/use-current-user"
// Client-side logic
```

### Type Safety
- All models in `modules/<feature>/types.ts`
- Prisma models auto-generated; reference via `@prisma/client`
- Use Zod for form validation with react-hook-form integration

### Path Aliases
- `@/*` resolves to workspace root (see tsconfig.json)
- Use `@/components`, `@/modules`, `@/lib` consistently

## External Dependencies & Integration

### Authentication Providers
- **GitHub**: Requires `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`
- **Google**: Requires `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
- **Fallback**: OAuth callbacks in [auth.ts](../auth.ts) handle new user creation and account linking

### Image Handling
- [next.config.ts](../next.config.ts) allows all remote image patterns via `remotePatterns` with wildcard hostname

### Styling & Icons
- Icons: Lucide React (`lucide-react`)
- CSS: Tailwind v4 + PostCSS
- Animations: tw-animate-css library

## Important Notes for AI Agents

1. **Never client-import auth**: Always use server actions or middleware; `"server-only"` guard in [auth.ts](../auth.ts) prevents accidental client imports
2. **Revalidate after mutations**: All server actions must call `revalidatePath()` to sync cache with DB changes
3. **Module isolation**: Each module is self-contained; cross-module imports are acceptable but prefer dependency injection
4. **Environment variables**: Set in `.env.local`; no hardcoded secrets
5. **Type consistency**: Database types flow from Prisma schema → types.ts → components
6. **Testing module**: `/modules/test/` exists but not yet populated; use as reference for new feature tests
