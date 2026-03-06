# Phase 1: Project Setup & Foundation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Initialize the mtouch Next.js project with all foundational tooling, database schema, and project structure.

**Architecture:** Monolith Next.js App Router with Prisma ORM connecting to PostgreSQL. shadcn/ui for components. TypeScript throughout.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Prisma, PostgreSQL, shadcn/ui, Radix UI, zod, jose, bcrypt, date-fns, echarts-for-react, @tanstack/react-query, @tanstack/react-table, @line/bot-sdk

---

### Task 1: Initialize Next.js project

**Step 1: Scaffold Next.js with TypeScript and Tailwind**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Select defaults. This creates the Next.js project in the current directory.

**Step 2: Verify it runs**

Run: `npm run dev`
Expected: Dev server starts on http://localhost:3000

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js project with TypeScript, Tailwind, ESLint"
```

---

### Task 2: Install core dependencies

**Step 1: Install production dependencies**

```bash
npm install prisma @prisma/client jose bcryptjs zod date-fns echarts echarts-for-react @tanstack/react-query @tanstack/react-table @line/bot-sdk formidable
```

**Step 2: Install dev dependencies**

```bash
npm install -D @types/bcryptjs @types/formidable
```

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install core dependencies (prisma, auth, UI, LINE SDK)"
```

---

### Task 3: Set up shadcn/ui

**Step 1: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

Select: New York style, Zinc base color, CSS variables = yes.

**Step 2: Add commonly needed components**

```bash
npx shadcn@latest add button input label card dialog table badge select textarea dropdown-menu avatar separator sheet tabs toast form
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: set up shadcn/ui with base components"
```

---

### Task 4: Set up Prisma and define schema

**Step 1: Initialize Prisma**

```bash
npx prisma init
```

This creates `prisma/schema.prisma` and `.env` with `DATABASE_URL`.

**Step 2: Define the complete Prisma schema**

Replace `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  customer
  support
  leader
  admin
}

enum IssueType {
  bug
  feature_request
  question
  complaint
  other
}

enum IssuePriority {
  low
  medium
  high
  critical
}

enum IssueStatus {
  open
  in_progress
  waiting_customer
  resolved
  closed
}

enum TeamMemberRole {
  leader
  member
}

model Company {
  id        String   @id @default(uuid())
  name      String   @unique
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  users  User[]
  issues Issue[]

  @@map("companies")
}

model User {
  id           String   @id @default(uuid())
  companyId    String   @map("company_id")
  name         String
  email        String   @unique
  passwordHash String   @map("password_hash")
  role         UserRole @default(customer)
  lineUserId   String?  @unique @map("line_user_id")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  company        Company          @relation(fields: [companyId], references: [id])
  reportedIssues Issue[]          @relation("reporter")
  assignedIssues Issue[]          @relation("assignee")
  teamMembers    TeamMember[]
  comments       IssueComment[]
  statusChanges  IssueStatusLog[]

  @@map("users")
}

model Team {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  createdAt   DateTime @default(now()) @map("created_at")

  members              TeamMember[]
  issues               Issue[]
  issueTypeMappings    TeamIssueTypeMapping[]

  @@map("teams")
}

model TeamMember {
  id     String         @id @default(uuid())
  teamId String         @map("team_id")
  userId String         @map("user_id")
  role   TeamMemberRole @default(member)

  team Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([teamId, userId])
  @@map("team_members")
}

model Issue {
  id                   String        @id @default(uuid())
  title                String
  description          String
  type                 IssueType
  priority             IssuePriority
  status               IssueStatus   @default(open)
  projectName          String?       @map("project_name")
  companyId            String        @map("company_id")
  reporterId           String        @map("reporter_id")
  assigneeId           String?       @map("assignee_id")
  teamId               String?       @map("team_id")
  firstRespondedAt     DateTime?     @map("first_responded_at")
  resolvedAt           DateTime?     @map("resolved_at")
  slaResponseDeadline  DateTime?     @map("sla_response_deadline")
  slaResolveDeadline   DateTime?     @map("sla_resolve_deadline")
  slaResponseBreached  Boolean       @default(false) @map("sla_response_breached")
  slaResolveBreached   Boolean       @default(false) @map("sla_resolve_breached")
  createdAt            DateTime      @default(now()) @map("created_at")
  updatedAt            DateTime      @updatedAt @map("updated_at")

  company     Company           @relation(fields: [companyId], references: [id])
  reporter    User              @relation("reporter", fields: [reporterId], references: [id])
  assignee    User?             @relation("assignee", fields: [assigneeId], references: [id])
  team        Team?             @relation(fields: [teamId], references: [id])
  comments    IssueComment[]
  attachments IssueAttachment[]
  statusLogs  IssueStatusLog[]

  @@map("issues")
}

model IssueComment {
  id        String   @id @default(uuid())
  issueId   String   @map("issue_id")
  userId    String   @map("user_id")
  content   String
  createdAt DateTime @default(now()) @map("created_at")

  issue Issue @relation(fields: [issueId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id])

  @@map("issue_comments")
}

model IssueAttachment {
  id        String   @id @default(uuid())
  issueId   String   @map("issue_id")
  fileUrl   String   @map("file_url")
  fileName  String   @map("file_name")
  fileType  String   @map("file_type")
  fileSize  Int      @map("file_size")
  createdAt DateTime @default(now()) @map("created_at")

  issue Issue @relation(fields: [issueId], references: [id], onDelete: Cascade)

  @@map("issue_attachments")
}

model IssueStatusLog {
  id          String       @id @default(uuid())
  issueId     String       @map("issue_id")
  fromStatus  IssueStatus? @map("from_status")
  toStatus    IssueStatus  @map("to_status")
  changedById String       @map("changed_by_id")
  createdAt   DateTime     @default(now()) @map("created_at")

  issue     Issue @relation(fields: [issueId], references: [id], onDelete: Cascade)
  changedBy User  @relation(fields: [changedById], references: [id])

  @@map("issue_status_logs")
}

model SlaPolicy {
  id               String        @id @default(uuid())
  priority         IssuePriority @unique
  responseTimeMins Int           @map("response_time_mins")
  resolveTimeMins  Int           @map("resolve_time_mins")
  createdAt        DateTime      @default(now()) @map("created_at")
  updatedAt        DateTime      @updatedAt @map("updated_at")

  @@map("sla_policies")
}

model TeamIssueTypeMapping {
  id        String    @id @default(uuid())
  issueType IssueType @unique @map("issue_type")
  teamId    String    @map("team_id")

  team Team @relation(fields: [teamId], references: [id], onDelete: Cascade)

  @@map("team_issue_type_mappings")
}
```

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: define complete Prisma schema with all tables, enums, relations"
```

---

### Task 5: Configure environment variables and run migration

**Step 1: Create .env.example template**

Create `.env.example`:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mtouch?schema=public"

# JWT
JWT_SECRET="your-jwt-secret-key-change-in-production"
JWT_REFRESH_SECRET="your-refresh-secret-key-change-in-production"

# LINE Bot
LINE_CHANNEL_ACCESS_TOKEN=""
LINE_CHANNEL_SECRET=""

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Step 2: Update `.env` with your local DATABASE_URL**

Make sure PostgreSQL is running and the database exists:
```bash
createdb mtouch
```

**Step 3: Run the initial migration**

```bash
npx prisma migrate dev --name init
```

Expected: Migration applied, `@prisma/client` generated.

**Step 4: Verify Prisma client**

```bash
npx prisma studio
```

Expected: Opens browser at localhost:5555 showing all 10 tables.

**Step 5: Add `.env` to `.gitignore` (should already be there from Next.js init)**

Verify `.gitignore` contains `.env*.local` and `.env`. If `.env` is not listed, add it.

**Step 6: Commit**

```bash
git add .env.example prisma/migrations .gitignore
git commit -m "feat: add env template and run initial Prisma migration"
```

---

### Task 6: Set up project structure and shared utilities

**Step 1: Create directory structure**

```bash
mkdir -p src/lib
mkdir -p src/types
mkdir -p src/components/ui
mkdir -p src/hooks
```

Note: `src/components/ui` may already exist from shadcn/ui init.

**Step 2: Create Prisma client singleton**

Create `src/lib/prisma.ts`:
```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**Step 3: Create shared types file**

Create `src/types/index.ts`:
```typescript
export type {
  UserRole,
  IssueType,
  IssuePriority,
  IssueStatus,
  TeamMemberRole,
} from "@prisma/client";
```

**Step 4: Create TanStack Query provider**

Create `src/components/providers.tsx`:
```typescript
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

**Step 5: Wire provider into root layout**

Modify `src/app/layout.tsx` — wrap `{children}` with `<Providers>`.

**Step 6: Commit**

```bash
git add src/lib/prisma.ts src/types/index.ts src/components/providers.tsx src/app/layout.tsx
git commit -m "feat: set up project structure, Prisma singleton, TanStack Query provider"
```

---

### Task 7: Seed default SLA policies

**Step 1: Create seed script**

Create `prisma/seed.ts`:
```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Default SLA policies
  const slaPolicies = [
    { priority: "critical" as const, responseTimeMins: 30, resolveTimeMins: 240 },
    { priority: "high" as const, responseTimeMins: 120, resolveTimeMins: 480 },
    { priority: "medium" as const, responseTimeMins: 240, resolveTimeMins: 1440 },
    { priority: "low" as const, responseTimeMins: 480, resolveTimeMins: 4320 },
  ];

  for (const policy of slaPolicies) {
    await prisma.slaPolicy.upsert({
      where: { priority: policy.priority },
      update: {
        responseTimeMins: policy.responseTimeMins,
        resolveTimeMins: policy.resolveTimeMins,
      },
      create: policy,
    });
  }

  console.log("Seeded default SLA policies");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Step 2: Add seed config to package.json**

Add to `package.json`:
```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

**Step 3: Install tsx for running seed**

```bash
npm install -D tsx
```

**Step 4: Run the seed**

```bash
npx prisma db seed
```

Expected: "Seeded default SLA policies"

**Step 5: Commit**

```bash
git add prisma/seed.ts package.json package-lock.json
git commit -m "feat: add seed script with default SLA policies"
```

---

### Task 8: Final verification

**Step 1: Run type check**

```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 2: Run lint**

```bash
npm run lint
```

Expected: No errors.

**Step 3: Run dev server**

```bash
npm run dev
```

Expected: Compiles successfully, no errors in console.

**Step 4: Update CLAUDE.md with build commands**

Add to CLAUDE.md:
```markdown
## Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npx tsc --noEmit` — Type check
- `npx prisma migrate dev` — Run migrations
- `npx prisma db seed` — Seed database
- `npx prisma studio` — Database GUI
- `npx prisma generate` — Regenerate Prisma client
```

**Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with build commands"
```
