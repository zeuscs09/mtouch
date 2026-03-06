# mtouch - Work Breakdown Structure (WBS)

## Phase 1: Project Setup & Foundation
- **1.1** Initialize Next.js project with TypeScript, Tailwind, ESLint
- **1.2** Set up PostgreSQL database + Prisma ORM
- **1.3** Define Prisma schema (all tables, enums, relations)
- **1.4** Run initial migration
- **1.5** Set up shadcn/ui + Radix UI components
- **1.6** Set up project structure (folders, shared types, utils)
- **1.7** Configure environment variables (.env template)

## Phase 2: Authentication & Authorization
- **2.1** Implement JWT auth utilities (sign, verify, refresh)
- **2.2** Create login API route (POST /api/auth/login)
- **2.3** Create register API route (POST /api/auth/register)
- **2.4** Create auth middleware (JWT validation + role check)
- **2.5** Build login page UI
- **2.6** Build register page UI
- **2.7** Implement role-based route protection (middleware.ts)
- **2.8** Create auth context/provider for client-side

## Phase 3: Core Data Management (Admin)
- **3.1** Company CRUD API routes
- **3.2** Company management UI (list, create, edit, delete)
- **3.3** User CRUD API routes (with company association)
- **3.4** User management UI
- **3.5** Team CRUD API routes
- **3.6** Team management UI (create team, add/remove members, set leader)
- **3.7** SLA policy CRUD API routes
- **3.8** SLA policy management UI
- **3.9** Team-Issue type mapping API + UI (auto-assign config)

## Phase 4: Issue Management
- **4.1** Issue CRUD API routes (create, read, update, list with filters)
- **4.2** Auto-assign logic (issue type -> team mapping)
- **4.3** SLA deadline calculation on issue creation
- **4.4** Issue status transition API (with validation)
- **4.5** Issue status log recording (audit trail)
- **4.6** Issue comment API routes (create, list)
- **4.7** File upload API route
- **4.8** Issue attachment API routes (upload, list, delete)

## Phase 5: Customer Portal UI
- **5.1** Customer layout (navbar, sidebar)
- **5.2** Submit issue form page (with file upload)
- **5.3** Issue list page (own company, with filters)
- **5.4** Issue detail page (view + comment thread)
- **5.5** Issue status tracker component

## Phase 6: Admin Dashboard UI
- **6.1** Admin layout (navbar, sidebar with navigation)
- **6.2** Issue list page (all issues, advanced filters, TanStack Table)
- **6.3** Issue detail page (assign, change status, comment)
- **6.4** SLA dashboard - compliance rate chart (ECharts)
- **6.5** SLA dashboard - avg response/resolve time charts
- **6.6** SLA dashboard - breached issues list
- **6.7** SLA dashboard - breakdown by priority chart
- **6.8** Overview dashboard (issue count by status, recent issues)

## Phase 7: LINE Bot Integration
- **7.1** Set up LINE Messaging API channel + webhook URL
- **7.2** Implement webhook handler (POST /api/webhook/line)
- **7.3** LINE account linking flow (link line_user_id to user)
- **7.4** Issue creation conversational flow (guided steps)
- **7.5** Rich Menu setup (Report Issue, My Issues, Help)
- **7.6** Issue status query via LINE ("My Issues" command)

## Phase 8: Notifications
- **8.1** LINE notification service (send message to user/group)
- **8.2** New issue notification to assigned team
- **8.3** Assignment notification to assignee
- **8.4** Status change notification to customer
- **8.5** SLA breach alert to team leader
- **8.6** New comment notification

## Phase 9: Testing & Polish
- **9.1** API route unit tests (key flows)
- **9.2** SLA calculation tests
- **9.3** Auth flow tests
- **9.4** Mobile responsive review
- **9.5** Thai language UI review
- **9.6** Error handling & loading states
- **9.7** Seed data script (demo companies, users, issues)

## Phase 10: Deployment
- **10.1** Production database setup
- **10.2** Environment configuration
- **10.3** Deploy to Vercel (or target platform)
- **10.4** LINE webhook URL configuration (production)
- **10.5** Smoke test on production

---

## Summary

| Phase | Tasks | Estimated Issues |
|-------|-------|-----------------|
| 1. Setup | 7 | 7 |
| 2. Auth | 8 | 8 |
| 3. Data Management | 9 | 9 |
| 4. Issue Management | 8 | 8 |
| 5. Customer Portal | 5 | 5 |
| 6. Admin Dashboard | 8 | 8 |
| 7. LINE Bot | 6 | 6 |
| 8. Notifications | 6 | 6 |
| 9. Testing | 7 | 7 |
| 10. Deployment | 5 | 5 |
| **Total** | **69** | **69** |
