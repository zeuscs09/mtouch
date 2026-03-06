# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

mtouch is a B2B customer issue reporting system built as a monolith Next.js application. Customers submit issues via web form or LINE bot. Support teams manage issues through an admin dashboard with SLA tracking and LINE notifications.

## Tech Stack

- **Framework:** Next.js (App Router + API Routes)
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **UI:** shadcn/ui + Radix UI + Tailwind CSS
- **Charts:** ECharts (echarts-for-react)
- **Data:** TanStack Query + TanStack Table
- **Auth:** JWT via jose library, bcrypt for passwords
- **LINE:** @line/bot-sdk
- **Validation:** zod
- **Date:** date-fns

## Architecture

Monolith Next.js app with route groups:
- `/(auth)` — Login/Register pages
- `/(customer)` — Customer portal (submit issues, view own company's issues)
- `/(admin)` — Admin dashboard (manage all issues, teams, companies, users, SLA)
- `/api` — REST API routes for all CRUD operations, auth, webhooks, file upload

Key patterns:
- JWT auth with httpOnly cookies (access token 15min, refresh 7 days)
- Role-based access: customer, support, leader, admin
- Company-scoped data isolation for customers
- SLA deadlines auto-calculated on issue creation
- LINE webhook at `/api/webhook/line`

## Database

10 tables: companies, users, teams, team_members, issues, issue_comments, issue_attachments, issue_status_logs, sla_policies, team_issue_type_mappings.

Key enums: UserRole, IssueType, IssuePriority, IssueStatus, TeamMemberRole.

See `docs/plans/2026-03-06-mtouch-design.md` for full schema.

## Design Documents

- PRD: `docs/plans/2026-03-06-mtouch-prd.md`
- System Design: `docs/plans/2026-03-06-mtouch-design.md`
- WBS: `docs/plans/2026-03-06-mtouch-wbs.md`

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npx tsc --noEmit` — Type check
- `npx prisma migrate dev` — Run migrations
- `npx prisma db seed` — Seed database
- `npx prisma studio` — Database GUI
- `npx prisma generate` — Regenerate Prisma client

## Prisma v7 Notes

- Uses `prisma.config.ts` for datasource URL and seed command (not in schema.prisma)
- PrismaClient requires `@prisma/adapter-pg` with `pg` Pool — see `src/lib/prisma.ts`
- Generated client output: `src/generated/prisma/` (gitignored)
- Import from `@/generated/prisma/client` in app code, `../src/generated/prisma/client.js` in seed

## UI Language

Primary: Thai. Secondary: English.
