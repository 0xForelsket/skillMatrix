# Implementation Roadmap

This roadmap assumes a 2-developer team working for ~5-6 weeks to MVP.

---

## Phase 1: Foundation & DevOps (Week 1)

*Goal: Get the local environment running with DB and Docker.*

### 1.1 Repo Setup
- [ ] Init Next.js 16 (App Router) + Bun
- [ ] Install Shadcn UI, Tailwind, Lucide React
- [ ] Set up Biome for linting

### 1.2 Database Containerization
- [ ] Create `docker-compose.yml` with Postgres 16 and MinIO (for local S3 dev)
- [ ] Configure Drizzle (`drizzle.config.ts`) to connect to localhost Postgres

### 1.3 Schema & Migrations
- [ ] Copy schema from `docs/schema.md` to `src/db/schema.ts`
- [ ] Run `bun drizzle-kit generate` and `bun drizzle-kit push`

### 1.4 Seeding Script (`src/scripts/seed.ts`)
- [ ] Create script to generate baseline data:
  - 1 Site ("Headquarters")
  - 3 Departments (Molding, Assembly, HR)
  - 5 Roles (Technician L1, Technician L2, Lead, Supervisor, Manager)
- [ ] Ensures every dev has identical baseline data

---

## Phase 1.5: Authentication & Authorization (Week 1-2)

*Goal: Secure the app with login and role-based access.*

### 1.5.1 NextAuth.js Setup
- [ ] Install `next-auth` and configure with Credentials Provider (email/password)
- [ ] Create auth routes at `app/api/auth/[...nextauth]/route.ts`
- [ ] Store sessions in database (Drizzle adapter) or JWT

### 1.5.2 Login UI
- [ ] Create `/login` page with email/password form
- [ ] Redirect to dashboard on success

### 1.5.3 Protected Routes Middleware
- [ ] Create `middleware.ts` to protect `/admin/*` routes
- [ ] Check session exists and `user.status === 'active'`

### 1.5.4 Role-Based Access Control (RBAC)

| Route/Action | Admin | Trainer | Auditor | Viewer |
|--------------|:-----:|:-------:|:-------:|:------:|
| Manage Users | ✓ | | | |
| Manage Skills Catalog | ✓ | | | |
| Certify Employees | ✓ | ✓ | | |
| View All Reports | ✓ | ✓ | ✓ | |
| View Own Skills | ✓ | ✓ | ✓ | ✓ |

- [ ] Create `src/lib/auth/permissions.ts` with `canAccess(user, action)` helper

### 1.5.5 User Management Page
- [ ] Admin-only page at `/admin/users`
- [ ] Create users, assign `appRole`, link to existing employee (optional)

---

## Phase 2: The Core Logic "The Brain" (Week 2)

*Goal: Implement the difficult business logic before building UI.*

### 2.1 UUIDv7 Utility
- [ ] Create `src/lib/id.ts` wrapping `uuidv7` package

### 2.2 The "Gap Analysis" Service
- [ ] Write the raw SQL query in `src/server/services/gap-analysis.ts`
- [ ] **Unit test thoroughly:**
  - Create test user, assign requirements → assert "MISSING"
  - Assign skill (old revision) → assert "OUTDATED"
  - Assign skill (current revision) → assert "VALID"
  - Assign skill (expires in 30 days) → assert "EXPIRING_SOON"

### 2.3 Requirement Matcher
- [ ] Create function `getRequirementsForEmployee(employeeId)` that resolves the Dept/Role/Project hierarchy

---

## Phase 3: Administrative UI (Week 3)

*Goal: Allow HR/Admins to manage the catalog.*

### 3.1 Employees Page
- [ ] Data Table with filters (Site, Dept)
- [ ] "Add Employee" Dialog (Server Action → DB Insert)
- [ ] Employee detail page with skill summary
- [ ] "Download Badge QR" button

### 3.2 Skills Catalog
- [ ] List of Skills with search/filter
- [ ] **Revision Manager:** Drawer/modal to "Draft New Revision"
- [ ] Activate/Archive revision workflow

### 3.3 File Upload (Presigned URL Flow)
- [ ] Server Action: `getUploadUrl(filename, type)` → Returns MinIO/S3 URL
- [ ] Client: `fetch(url, { method: 'PUT', body: file })`
- [ ] Server Action: `confirmUpload(key)` → Insert into `attachments`

---

## Phase 3.5: QR Badge Skill Viewer (Week 3-4)

*Goal: Allow supervisors/auditors to scan a badge and instantly see employee qualifications—no login required.*

### 3.5.1 Badge Token Generation
- [ ] When creating employee, generate secure random `badgeToken` (e.g., `nanoid(21)`)
- [ ] Token embedded in QR code URL, NOT the employee number
- [ ] If badge lost → regenerate token → old QR becomes invalid

### 3.5.2 Public Skills Page (`/b/[badgeToken]`)
- [ ] **No auth required** — accessible by anyone with the QR code
- [ ] Route: `app/(public)/b/[badgeToken]/page.tsx`
- [ ] Fetches employee by `badgeToken`, returns 404 if not found or terminated

### 3.5.3 Page Content

**Header:**
- Employee name, photo (optional), department, role, site

**Skills List:**

| Skill Name | Level | Certified Date | Expires | Status |
|------------|-------|----------------|---------|--------|
| Injection Molding 101 | 2 | Jan 2026 | Jan 2027 | ✅ Valid |
| Forklift Operation | 1 | Dec 2025 | Dec 2026 | ⚠️ Expiring Soon |
| Safety Protocols Rev C | 1 | Nov 2025 | — | ✅ Valid |

- [ ] Color-coded status badges (green/yellow/red)
- [ ] **No edit actions** — read-only public view

### 3.5.4 QR Code Generation
- [ ] Add "Download Badge QR" button on employee detail page
- [ ] Generate QR code containing URL: `https://skills.yourcompany.com/b/{badgeToken}`
- [ ] Use `qrcode` npm package for generation
- [ ] Option to print as a badge-sized label

### 3.5.5 Security Considerations
- [ ] `badgeToken` is random, not guessable from `employeeNumber`
- [ ] Rate-limit the `/b/[badgeToken]` route to prevent enumeration attacks
- [ ] Consider adding optional PIN for sensitive environments (future enhancement)

---

## Phase 4: Matrix & Training Execution (Week 4)

*Goal: The user-facing operational screens.*

### 4.1 The Matrix View
- [ ] Massive grid component: Rows = Employees, Cols = Skills
- [ ] Cells = Colored Badges (Green/Red/Yellow)
- [ ] *Performance Note:* Use TanStack Virtual if you have >100 rows

### 4.2 "Quick Certify" Mode
- [ ] View for Trainers
- [ ] Select skill (e.g., "Injection Molding 101")
- [ ] Scan Employee Badge (or select from list)
- [ ] Click "Certify" → Creates `employee_skills` record with UUIDv7

---

## Phase 5: Offline Sync & Site Prep (Week 5)

*Goal: Prepare for the factory floor.*

### 5.1 Offline State Management
- [ ] Install **TanStack Query (React Query)** with built-in offline caching
- [ ] Configure `staleTime: Infinity` for Skills Catalog (rarely changes)

### 5.2 The "Pending Sync" Queue
- [ ] If offline, store "New Certifications" in IndexedDB (use Dexie.js)
- [ ] Create global `useOnlineStatus` hook
- [ ] When back online, iterate queue and POST to Server Actions
- [ ] Handle conflicts (last-write-wins or queue for admin review)

### 5.3 Docker Production Build
- [ ] Optimize `Dockerfile` (multi-stage) for production
- [ ] Test deployment on local Linux server
- [ ] See `docs/deployment.md` for configuration

---

## Timeline Summary

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | Foundation + Auth | Dev environment, DB, login, RBAC |
| 2 | Core Logic | Gap analysis, requirement matching |
| 3 | Admin UI | Employee/Skill CRUD, file uploads |
| 3-4 | QR Badge | Public skill viewer, QR generation |
| 4 | Matrix | Skill matrix grid, quick certify |
| 5 | Offline + Deploy | PWA offline support, Docker prod |

---

## Future Enhancements (Post-MVP)

- [ ] **Audit Logs:** Track who changed what and when
- [ ] **Bulk Import:** CSV upload for employees and skills
- [ ] **Notifications:** Email alerts for expiring certifications
- [ ] **Mobile App:** React Native wrapper for trainers
- [ ] **LMS Integration:** Sync with external learning management systems
- [ ] **Analytics Dashboard:** Compliance trends, training metrics
