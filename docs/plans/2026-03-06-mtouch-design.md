# mtouch - System Design Document

## 1. Architecture

Monolith Next.js application with API Routes serving as the backend.

```
Client (Browser/LINE)
    |
Next.js App (Vercel/Node.js)
├── /app
│   ├── /(auth)          - Login/Register pages
│   ├── /(customer)      - Customer portal
│   │   ├── /issues      - Issue list
│   │   ├── /issues/new  - Submit issue form
│   │   └── /issues/[id] - Issue detail + comments
│   ├── /(admin)         - Admin dashboard
│   │   ├── /dashboard   - SLA charts + overview
│   │   ├── /issues      - All issues management
│   │   ├── /teams       - Team management
│   │   ├── /companies   - Company management
│   │   ├── /users       - User management
│   │   └── /settings    - SLA policies + mappings
│   └── /api
│       ├── /auth/*      - JWT auth endpoints
│       ├── /issues/*    - Issue CRUD + comments
│       ├── /teams/*     - Team CRUD
│       ├── /companies/* - Company CRUD
│       ├── /users/*     - User CRUD
│       ├── /sla/*       - SLA policy CRUD
│       ├── /upload      - File upload
│       ├── /webhook/line - LINE webhook handler
│       └── /dashboard/* - Dashboard aggregation
│
├── LINE Bot (@line/bot-sdk)
│   └── Webhook handler → calls internal API logic
│
└── PostgreSQL (Prisma ORM)
```

## 2. Database Schema (Prisma)

### companies
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | String | unique |
| created_at | DateTime | default now |
| updated_at | DateTime | auto |

### users
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| company_id | UUID | FK -> companies |
| name | String | |
| email | String | unique |
| password_hash | String | |
| role | Enum | customer, support, leader, admin |
| line_user_id | String? | nullable, unique |
| created_at | DateTime | |
| updated_at | DateTime | |

### teams
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | String | unique |
| description | String? | |
| created_at | DateTime | |

### team_members
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| team_id | UUID | FK -> teams |
| user_id | UUID | FK -> users |
| role | Enum | leader, member |
| unique | | (team_id, user_id) |

### issues
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| title | String | |
| description | String | text |
| type | Enum | bug, feature_request, question, complaint, other |
| priority | Enum | low, medium, high, critical |
| status | Enum | open, in_progress, waiting_customer, resolved, closed |
| project_name | String? | project/contract name |
| company_id | UUID | FK -> companies |
| reporter_id | UUID | FK -> users |
| assignee_id | UUID? | FK -> users |
| team_id | UUID? | FK -> teams |
| first_responded_at | DateTime? | |
| resolved_at | DateTime? | |
| sla_response_deadline | DateTime? | |
| sla_resolve_deadline | DateTime? | |
| sla_response_breached | Boolean | default false |
| sla_resolve_breached | Boolean | default false |
| created_at | DateTime | |
| updated_at | DateTime | |

### issue_comments
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| issue_id | UUID | FK -> issues |
| user_id | UUID | FK -> users |
| content | String | text |
| created_at | DateTime | |

### issue_attachments
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| issue_id | UUID | FK -> issues |
| file_url | String | |
| file_name | String | |
| file_type | String | mime type |
| file_size | Int | bytes |
| created_at | DateTime | |

### issue_status_logs
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| issue_id | UUID | FK -> issues |
| from_status | Enum? | nullable (first log) |
| to_status | Enum | |
| changed_by_id | UUID | FK -> users |
| created_at | DateTime | |

### sla_policies
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| priority | Enum | unique |
| response_time_mins | Int | |
| resolve_time_mins | Int | |
| created_at | DateTime | |
| updated_at | DateTime | |

### team_issue_type_mappings
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| issue_type | Enum | |
| team_id | UUID | FK -> teams |
| unique | | (issue_type) |

## 3. Authentication Flow

```
Login → POST /api/auth/login → verify password → issue JWT (access + refresh)
                                                  ↓
                                          JWT stored in httpOnly cookie
                                                  ↓
                                          Middleware validates JWT on every request
                                                  ↓
                                          Role-based route protection
```

- Access token: 15 min expiry
- Refresh token: 7 days expiry
- Middleware checks role for admin routes

## 4. LINE Bot Flow

```
Customer sends message via LINE
    ↓
LINE Platform → POST /api/webhook/line
    ↓
Parse message → Check if line_user_id linked to user
    ↓
If not linked → Send link account instructions
If linked → Start issue creation flow:
    1. Ask issue type (Quick Reply buttons)
    2. Ask priority (Quick Reply buttons)
    3. Ask title (free text)
    4. Ask description (free text)
    5. Ask for attachments (optional, image/file)
    6. Confirm and submit
    ↓
Create issue via internal service layer
    ↓
Send confirmation to customer
Send notification to assigned team (LINE group)
```

## 5. SLA Engine

On issue creation:
1. Look up SLA policy by issue priority
2. Calculate deadlines: created_at + response_time / resolve_time
3. Store deadlines in issue record

On first comment by support:
1. Set first_responded_at = now
2. Check if breached (first_responded_at > sla_response_deadline)

On status change to resolved:
1. Set resolved_at = now
2. Check if breached (resolved_at > sla_resolve_deadline)

Background check (optional cron):
1. Periodically scan open issues
2. Flag any that have passed deadline without response/resolution
3. Send alert via LINE to team leader

## 6. Notification Strategy

| Event | Channel | Recipient |
|-------|---------|-----------|
| New issue created | LINE | Assigned team |
| Issue assigned to you | LINE | Assignee |
| New comment from customer | LINE | Assignee |
| Status changed | LINE | Customer (reporter) |
| SLA about to breach (80%) | LINE | Team leader |
| SLA breached | LINE | Team leader + Admin |

## 7. File Upload

- MVP: Store in `/public/uploads/[issue_id]/` with UUID filenames
- Max 10MB per file, max 5 files per issue
- Accepted types: image/*, application/pdf, .doc, .docx, .xls, .xlsx
- Future: migrate to S3/R2

## 8. Key Libraries

| Purpose | Package |
|---------|---------|
| UI Components | @radix-ui/*, shadcn/ui |
| Charts | echarts, echarts-for-react |
| Data Table | @tanstack/react-table |
| Server State | @tanstack/react-query |
| ORM | prisma, @prisma/client |
| Auth | jose (JWT), bcrypt |
| LINE | @line/bot-sdk |
| Form Validation | zod |
| File Upload | formidable or multer |
| Date Handling | date-fns |
