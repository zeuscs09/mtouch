# mtouch - Customer Issue Reporting System PRD

## 1. Overview

**Product Name:** mtouch
**Version:** 1.0
**Date:** 2026-03-06

mtouch is a B2B customer issue reporting system that allows corporate clients to submit issues via a web form or LINE bot. Internal support teams manage issues through an admin dashboard with SLA tracking and LINE notifications.

## 2. Problem Statement

Corporate clients need a streamlined way to report issues (bugs, feature requests, questions, complaints) across multiple channels. Support teams need visibility into SLA compliance and the ability to assign, track, and resolve issues efficiently.

## 3. Target Users

| User Type | Description |
|-----------|-------------|
| **Customer (B2B)** | Corporate client staff who report issues. Must login and be associated with a company. |
| **Support Agent** | Internal team members who handle and resolve issues. |
| **Support Leader** | Team leads who assign issues and monitor SLA. |
| **Admin** | System administrators who manage teams, companies, SLA policies, and users. |

## 4. Channels

- **Web Form** - Authenticated web interface for customers to submit and track issues
- **LINE Messaging API Bot** - Customers can report issues via LINE chat with guided flow

## 5. Functional Requirements

### 5.1 Authentication & Authorization

- FR-AUTH-01: JWT-based authentication (login/register)
- FR-AUTH-02: Role-based access control (customer, support, leader, admin)
- FR-AUTH-03: Company-scoped data isolation (customers see only their company's issues)
- FR-AUTH-04: LINE account linking (link LINE user ID to system user)

### 5.2 Issue Management

- FR-ISS-01: Create issue with fields: title, description, type, priority, project/contract name, attachments
- FR-ISS-02: Issue types: bug, feature_request, question, complaint, other
- FR-ISS-03: Priority levels: low, medium, high, critical
- FR-ISS-04: Status workflow: open -> in_progress -> waiting_customer -> resolved -> closed
- FR-ISS-05: File/image attachments (max 10MB per file, max 5 files per issue)
- FR-ISS-06: Comment thread on each issue (both customer and support can comment)
- FR-ISS-07: Issue history/audit log (all status changes tracked)

### 5.3 Team Assignment

- FR-TEAM-01: Create and manage teams (name, members, leader)
- FR-TEAM-02: Auto-assign issues to teams based on issue type mapping (configurable)
- FR-TEAM-03: Manual assign/reassign issues to specific team or individual
- FR-TEAM-04: Team members can only see issues assigned to their team

### 5.4 SLA Tracking

- FR-SLA-01: Configurable SLA policies per priority level
- FR-SLA-02: Track response time (time to first response from support)
- FR-SLA-03: Track resolution time (time from creation to resolved)
- FR-SLA-04: Auto-calculate SLA deadlines on issue creation
- FR-SLA-05: SLA breach detection and flagging
- FR-SLA-06: Default SLA policy:

| Priority | Response Time | Resolve Time |
|----------|--------------|--------------|
| Critical | 30 min | 4 hours |
| High | 2 hours | 8 hours |
| Medium | 4 hours | 24 hours |
| Low | 8 hours | 72 hours |

### 5.5 LINE Bot

- FR-LINE-01: Receive issue reports via LINE chat (guided conversation flow)
- FR-LINE-02: Rich Menu with options: Report Issue, My Issues, Help
- FR-LINE-03: Issue status notifications to customer via LINE
- FR-LINE-04: New issue notifications to assigned team via LINE group/notify

### 5.6 Admin Dashboard

- FR-DASH-01: Issue list with filters (status, priority, team, company, date range)
- FR-DASH-02: Issue detail view with comments and history
- FR-DASH-03: SLA dashboard with charts:
  - SLA compliance rate per team/month
  - Average response time
  - Average resolve time
  - Breached issues list
  - SLA breakdown by priority
- FR-DASH-04: Team management (CRUD teams, assign members)
- FR-DASH-05: Company management (CRUD companies)
- FR-DASH-06: User management (CRUD users, role assignment)
- FR-DASH-07: SLA policy configuration

### 5.7 Customer Portal

- FR-CUST-01: Submit new issue form
- FR-CUST-02: View own company's issue list with status
- FR-CUST-03: View issue detail and add comments
- FR-CUST-04: Receive email/LINE notifications on status changes

## 6. Non-Functional Requirements

- NFR-01: Response time < 500ms for API calls
- NFR-02: Support file uploads up to 10MB
- NFR-03: Mobile-responsive web interface
- NFR-04: Thai language UI (primary), English (secondary)
- NFR-05: Data retention: issues kept indefinitely
- NFR-06: Concurrent users: up to 100

## 7. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router + API Routes) |
| UI Components | shadcn/ui + Radix UI |
| Charts | ECharts |
| Data Fetching/Tables | TanStack Query + TanStack Table |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT (jose library) |
| LINE | @line/bot-sdk |
| File Storage | Local filesystem (MVP) / S3 (future) |
| Styling | Tailwind CSS |

## 8. Database Schema

### Tables

- **companies** - B2B client organizations
- **users** - All system users (customers + support + admin)
- **teams** - Support teams
- **team_members** - Team membership (user + role in team)
- **issues** - Issue tickets
- **issue_comments** - Comment threads on issues
- **issue_attachments** - File attachments
- **issue_status_logs** - Status change audit trail
- **sla_policies** - SLA rules per priority
- **team_issue_type_mappings** - Auto-assign config (issue type -> team)

### Key Relationships

- User belongs to Company
- Issue belongs to Company, reported by User, assigned to User/Team
- Team has many TeamMembers (Users)
- Issue has many Comments, Attachments, StatusLogs

## 9. Success Criteria

- Customers can submit issues via web and LINE within 2 minutes
- Support team receives notification within 1 minute of issue creation
- SLA compliance rate visible in real-time on dashboard
- 95% of issues correctly auto-assigned to the right team
