# Copilot Instructions for Four Seasons Dispatch Demo

## Project Overview
**Four Seasons Dispatch Demo** is a Next.js field service dispatch system for managing customers, locations, work orders, and technician assignments. It's currently a prototype transitioning from in-memory storage ([lib/store.ts](lib/store.ts)) to Prisma PostgreSQL backend.

### Key Characteristics
- **Framework**: Next.js 16 (App Router with TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **State Management**: Mix of Prisma models (database) and in-memory store (prototype phase)
- **Styling**: Tailwind CSS v4 with custom brand colors
- **UI Pattern**: Sidebar navigation with dynamic route-based pages

## Architecture Overview

### Data Layer Transition
- **Legacy**: [lib/store.ts](lib/store.ts) - in-memory store for rapid prototyping (resets on dev server restart)
- **Current**: [prisma/schema.prisma](prisma/schema.prisma) - PostgreSQL models defining source of truth
- **Pattern**: API routes query Prisma directly; components call API routes

### Core Domain Models (Prisma)
| Model | Purpose | Key Fields |
|-------|---------|-----------|
| `Customer` | Service clients | id, name, phone, email; relations to Locations, WorkOrders, Invoices |
| `Location` | Service sites within a customer | id, customerId, name, address, notes |
| `WorkOrder` | Service jobs (e.g., HVAC repair) | id, jobNumber (auto-increment), status (enum), completedAt, customer/location refs |
| `Invoice` | Billing tied to workOrder+location | id, status (enum), subtotal (cents) |

Status enums are strict: use `WorkOrderStatus` enum values (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELED) and `InvoiceStatus` (DRAFT, SENT, PAID, OVERDUE).

### API Route Structure
- **Pattern**: RESTful routes with Prisma queries; route.ts files in [app/api/](app/api/)
- **Customers**: `GET /api/customers`, `POST /api/customers`, `GET /api/customers/[id]`
- **Locations**: `GET /api/customers/[id]/locations`, `POST /api/locations/[id]`
- **Work Orders**: `GET /api/work-orders`, `POST /api/work-orders`, `GET /api/work-orders/[id]`
- **Dispatch Events**: Lookup, status tracking at `GET /api/dispatch-events`
- **Error Response**: Return `NextResponse(..., {status: 4xx/5xx})` for validation/server errors; clients expect JSON with meaningful messages

### Page Routing & UI Architecture
- **Root Layout** ([app/layout.tsx](app/layout.tsx)): Sidebar nav with 5 main sections (Dashboard, Customers, Work Orders, Dispatch, Techs)
- **Dynamic Pages**: Customers view has nested routes: `[customerId]/locations/[locationId]/` and `/work-orders/new`
- **Pattern**: Pages use URL params via `useParams()` or segment matching; call API routes for data

## Developer Workflows

### Build & Dev Commands
```bash
npm run dev      # Start Next.js dev server on :3000
npm run build    # Production build
npm run start    # Run production build
npm run lint     # Run ESLint
```

### Database Migrations
```bash
npx prisma migrate dev --name <migration_name>  # Create + apply migration
npx prisma db seed                               # Seed from prisma/seed.js
```

**Important**: Migrations are tracked in [prisma/migrations/](prisma/migrations/); always create migrations for schema changes, don't modify existing ones.

### Debugging
- Check `.env.local` for DATABASE_URL and other secrets
- Prisma client initialized in [lib/prisma.ts](lib/prisma.ts) with PostgreSQL adapter
- Dev mode caches singleton Prisma instance to prevent connection pool exhaustion

## Project-Specific Patterns & Conventions

### Type Definitions
- **Prisma Types**: Import from `@prisma/client` (auto-generated, e.g., `import { WorkOrder } from "@prisma/client"`)
- **Store Types** (legacy): Defined in [lib/store.ts](lib/store.ts) for prototype features not yet in Prisma
- **API Response Types**: Return `NextResponse.json(data)` with appropriate status codes; validation errors return status 400 with plain text message

### Component Patterns
- **Server Components by Default**: Pages and layouts are server components; use `"use client"` only when needed (e.g., interactivity, hooks)
- **Sidebar Links**: Use [app/components/SidebarLink.tsx](app/components/SidebarLink.tsx) for navigation with active state
- **Navigation Component**: [app/customers/components/CustomerNav.tsx](app/customers/components/CustomerNav.tsx) shows tab-style nav for customer sub-pages

### Styling
- **Tailwind v4**: Config in [tailwind.config.js](tailwind.config.js)
- **Brand Colors**: Custom dark theme in styles; use `bg-brand-dark`, `text-brand-muted` (see globals.css for definitions)
- **Spacing**: Consistent use of `space-y-2`, `gap-3` for semantic layouts

### Cross-Component Data Flow
- **API-First**: Components on demand call API routes to fetch/mutate data (no client-side state management library)
- **Customer Detail Pages**: Fetch related Locations and WorkOrders via nested API calls (e.g., `/api/customers/[id]/locations`)
- **Attachments** (WorkOrder feature): Stored as metadata in store; prepare Prisma schema for file integration if expanding

## Testing & Validation

- **Lint**: Run `npm run lint` for ESLint rules (extends Next.js config)
- **Types**: TypeScript strict mode enabled; use `@types/` packages for node/react
- **Seed Data**: [prisma/seed.js](prisma/seed.js) populates dev database; update after schema changes

## Key Integration Points

### External Dependencies
- **@dnd-kit**: Drag-and-drop library (installed but not yet integrated; plan for task assignment UI)
- **@prisma/adapter-pg**: PostgreSQL connection adapter with edge runtime support
- **pg**: Node.js PostgreSQL client (used by Prisma)

### Database Connection
Prisma client is a singleton exported from [lib/prisma.ts](lib/prisma.ts). Import with:
```typescript
import { prisma } from "@/lib/prisma";
// Then use: prisma.customer.findUnique(), etc.
```

## Common Tasks & File Locations

| Task | Primary Files |
|------|---|
| Add new API endpoint | [app/api/](app/api/) - create new route.ts |
| Add database model | [prisma/schema.prisma](prisma/schema.prisma) + create migration |
| Add page/route | [app/](app/) - create page.tsx in route folder |
| Add reusable component | [app/components/](app/components/) (global) or feature subfolder (scoped) |
| Update styling | [app/globals.css](app/globals.css) or Tailwind classes inline |
| Debug DB issues | Check [lib/prisma.ts](lib/prisma.ts) singleton initialization + migrations in [prisma/migrations/](prisma/migrations/) |

## Notes for AI Agents

- **Prototype Phase**: Some features exist in [lib/store.ts](lib/store.ts) but not yet in Prisma; prioritize Prisma for new features
- **Enum Strictness**: WorkOrderStatus and InvoiceStatus are enums; don't use string literals outside the defined set
- **Cascading Deletes**: Customer/Location deletions cascade to WorkOrders/Invoices; handle carefully in endpoints
- **Auto-increment Fields**: jobNumber and invoiceNumber auto-increment; don't set manually unless migrating legacy data
- **Environment Setup**: Requires DATABASE_URL (.env.local) pointing to PostgreSQL; Docker Compose file present for local DB
