# Authentication & Identity Architecture

A comprehensive guide to the authentication model, identity separation, and access patterns in Caliber.

## Table of Contents

- [Core Design Philosophy](#core-design-philosophy)
- [Identity Model: Users vs Employees](#identity-model-users-vs-employees)
- [The Three Personas](#the-three-personas)
- [Authentication Flow](#authentication-flow)
- [Badge-Based Identification](#badge-based-identification)
- [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
- [Session Management](#session-management)
- [Security Considerations](#security-considerations)
- [Implementation Checklist](#implementation-checklist)

---

## Core Design Philosophy

Manufacturing environments have unique authentication requirements that differ from typical web applications:

### The Problem

1. **Not everyone needs a login.** Floor workers (welders, machine operators, assemblers) need their skills tracked but don't interact with the system directly.

2. **Skill verification is visual.** Supervisors need to quickly verify a worker's qualifications by scanning a badge—no login, no searching.

3. **Some users aren't employees.** External auditors, consultants, and corporate compliance officers need system access but aren't in the HR system.

4. **Employee numbers are not secrets.** They're printed on badges, posted on training boards, used in payroll systems—they cannot be authentication credentials.

### The Solution: Identity Separation

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           IDENTITY MODEL                                    │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────┐                ┌─────────────────────┐           │
│   │       USERS         │                │     EMPLOYEES       │           │
│   │   (Authentication)  │                │  (Business Entity)  │           │
│   ├─────────────────────┤                ├─────────────────────┤           │
│   │ • email             │                │ • employeeNumber    │           │
│   │ • passwordHash      │───optional────▶│ • badgeToken        │           │
│   │ • appRole           │    link        │ • name, site, dept  │           │
│   │ • status            │                │ • skills, certs     │           │
│   └─────────────────────┘                └─────────────────────┘           │
│           │                                        │                        │
│           │                                        │                        │
│           ▼                                        ▼                        │
│   ┌─────────────────────┐                ┌─────────────────────┐           │
│   │   SYSTEM ACCESS     │                │   SKILL TRACKING    │           │
│   │   • Login/logout    │                │   • Certifications  │           │
│   │   • CRUD operations │                │   • Gap analysis    │           │
│   │   • Reports         │                │   • Badge scanner   │           │
│   └─────────────────────┘                └─────────────────────┘           │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Identity Model: Users vs Employees

### Users Table (Authentication)

The `users` table handles **system access**—who can log in and what they can do.

```typescript
export const users = pgTable('users', {
  id: text('id').primaryKey(),                    // UUIDv7
  email: text('email').notNull().unique(),        // Login credential
  passwordHash: text('password_hash'),            // Null if SSO-only
  appRole: text('app_role', { 
    enum: ['admin', 'skill_manager', 'trainer', 'auditor', 'viewer'] 
  }).default('viewer'),
  status: text('status', { 
    enum: ['active', 'disabled'] 
  }).default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**Key characteristics:**
- **Email is the login identifier** (not employee number)
- **passwordHash is nullable** (supports future SSO integration)
- **appRole determines permissions** (RBAC)
- **status can disable access** without deletion

### Employees Table (Business Entity)

The `employees` table handles **organizational tracking**—HR records and skill management.

```typescript
export const employees = pgTable('employees', {
  ...commonCols,                                  // id, createdAt, updatedAt, deletedAt
  userId: text('user_id').references(() => users.id),  // Optional link to login
  siteId: text('site_id').references(() => sites.id).notNull(),
  departmentId: text('department_id').references(() => departments.id),
  roleId: text('role_id').references(() => roles.id),  // Job title, NOT permissions
  employeeNumber: text('employee_number').notNull().unique(),  // HR identifier
  badgeToken: text('badge_token').notNull().unique(),  // QR code token
  name: text('name').notNull(),
  photoUrl: text('photo_url'),
  email: text('email'),                           // Contact email, NOT for login
  status: text('status', { 
    enum: ['active', 'terminated', 'leave'] 
  }).default('active'),
});
```

**Key characteristics:**
- **userId is nullable** — most employees won't have logins
- **employeeNumber is for HR/display** — visible, not secret
- **badgeToken is for QR codes** — random, regeneratable, URL-safe
- **email here is contact info** — distinct from `users.email` (login)
- **roleId is job title** — "Technician L2" — NOT app permissions

### The Link: `employees.userId`

This nullable foreign key connects the two worlds:

| Scenario | `employees.userId` | Meaning |
|----------|-------------------|---------|
| Floor worker | `NULL` | Has no login, identified by badge only |
| Trainer | Points to `users.id` | Can log in AND has skill records |
| External auditor | N/A (no employee record) | Login only, no HR record |

---

## The Three Personas

### Persona 1: Floor Worker (Employee Only)

**Example:** Maria, a machine operator at the Austin plant.

```
┌─────────────────────────────────────────────────────────────┐
│ FLOOR WORKER: Maria                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Has:     employees record                                  │
│  No:      users record                                      │
│                                                             │
│  Database:                                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ employees                                            │   │
│  │ ├── id: "emp_abc123"                                │   │
│  │ ├── userId: NULL  ←── No login!                     │   │
│  │ ├── employeeNumber: "EMP-0042"                      │   │
│  │ ├── badgeToken: "qR7xK9mN..."  ←── For QR code      │   │
│  │ ├── name: "Maria Garcia"                            │   │
│  │ ├── siteId: "site_austin"                           │   │
│  │ └── status: "active"                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  How Maria interacts with the system:                       │
│  1. Trainer scans her badge QR code                         │
│  2. System looks up by badgeToken                           │
│  3. Trainer records certification                           │
│  4. Maria scans her own badge to see her skills             │
│                                                             │
│  Maria CANNOT:                                              │
│  ✗ Log into the web app                                    │
│  ✗ Certify other employees                                 │
│  ✗ View admin pages                                        │
│                                                             │
│  Maria CAN:                                                │
│  ✓ Have her badge scanned                                  │
│  ✓ View her own skills via public badge page               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Persona 2: Trainer (Employee + User)

**Example:** Carlos, a lead technician who also trains new hires.

```
┌─────────────────────────────────────────────────────────────┐
│ TRAINER: Carlos                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Has:     Both employees AND users records                  │
│  Link:    employees.userId → users.id                       │
│                                                             │
│  Database:                                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ users                                                │   │
│  │ ├── id: "usr_xyz789"                                │   │
│  │ ├── email: "carlos.trainer@company.com"  ←── Login  │   │
│  │ ├── passwordHash: "$argon2id$..."                   │   │
│  │ ├── appRole: "trainer"  ←── Permissions             │   │
│  │ └── status: "active"                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                         ▲                                   │
│                         │ userId                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ employees                                            │   │
│  │ ├── id: "emp_def456"                                │   │
│  │ ├── userId: "usr_xyz789"  ←── Linked!               │   │
│  │ ├── employeeNumber: "EMP-0108"                      │   │
│  │ ├── badgeToken: "tR4pL2vX..."                       │   │
│  │ ├── name: "Carlos Mendez"                           │   │
│  │ └── roleId: "role_lead_tech"  ←── Job title         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  How Carlos interacts with the system:                      │
│  1. Logs in with email + password                           │
│  2. Views skill matrix, employee list                       │
│  3. Scans worker badges to certify them                     │
│  4. Can also view his own skills via badge                  │
│                                                             │
│  Carlos CAN:                                               │
│  ✓ Log into web app                                        │
│  ✓ Certify employees on skills                             │
│  ✓ View reports and matrix                                 │
│  ✓ See his own skill record                                │
│                                                             │
│  Carlos CANNOT:                                            │
│  ✗ Manage users (admin only)                               │
│  ✗ Create/edit skill catalog (skill_manager only)          │
│  ✗ Revoke certifications (requires skill_manager)          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Persona 3: External Auditor (User Only)

**Example:** Janet, a corporate compliance auditor visiting quarterly.

```
┌─────────────────────────────────────────────────────────────┐
│ EXTERNAL AUDITOR: Janet                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Has:     users record ONLY                                 │
│  No:      employees record                                  │
│                                                             │
│  Database:                                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ users                                                │   │
│  │ ├── id: "usr_aud001"                                │   │
│  │ ├── email: "janet.audit@auditors.com"               │   │
│  │ ├── passwordHash: "$argon2id$..."                   │   │
│  │ ├── appRole: "auditor"  ←── Read-only access        │   │
│  │ └── status: "active"                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  No employees record — Janet is not employed here!          │
│                                                             │
│  How Janet interacts with the system:                       │
│  1. Logs in with email + password                           │
│  2. Views audit logs, compliance reports                    │
│  3. Exports data for compliance review                      │
│  4. Cannot modify any data                                  │
│                                                             │
│  Janet CAN:                                                │
│  ✓ Log into web app                                        │
│  ✓ View all employee skill records                         │
│  ✓ View audit logs (who certified whom, when)              │
│  ✓ Export reports                                          │
│                                                             │
│  Janet CANNOT:                                             │
│  ✗ Modify any data                                         │
│  ✗ Certify employees                                       │
│  ✗ Create/edit skills                                      │
│  ✗ Manage users                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Authentication Flow

### Login Flow (Email + Password)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           LOGIN FLOW                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. User submits email + password                                        │
│     POST /api/auth/signin                                               │
│     { email: "carlos@company.com", password: "..." }                    │
│                                                                          │
│  2. Server validates credentials                                         │
│     ┌─────────────────────────────────────────────────────────────┐     │
│     │ SELECT * FROM users WHERE email = ? AND status = 'active'   │     │
│     └─────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  3. Verify password hash                                                 │
│     ┌─────────────────────────────────────────────────────────────┐     │
│     │ await argon2.verify(user.passwordHash, password)            │     │
│     └─────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  4. Create session (JWT or database session)                            │
│     ┌─────────────────────────────────────────────────────────────┐     │
│     │ Session contains:                                            │     │
│     │ • userId: "usr_xyz789"                                       │     │
│     │ • email: "carlos@company.com"                                │     │
│     │ • appRole: "trainer"                                         │     │
│     │ • employeeId: "emp_def456" (if linked)                       │     │
│     └─────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  5. Set session cookie, redirect to dashboard                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Badge Scan Flow (No Login Required)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BADGE SCAN FLOW                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Supervisor scans QR code on worker's badge                          │
│     QR contains: https://skills.company.com/b/qR7xK9mN2pL5vX8tY3wA     │
│                                                   └── badgeToken        │
│                                                                          │
│  2. Browser navigates to public route                                    │
│     GET /b/qR7xK9mN2pL5vX8tY3wA                                        │
│     (No authentication required!)                                        │
│                                                                          │
│  3. Server looks up employee by token                                    │
│     ┌─────────────────────────────────────────────────────────────┐     │
│     │ SELECT e.*, d.name as dept, r.name as role                   │     │
│     │ FROM employees e                                             │     │
│     │ LEFT JOIN departments d ON d.id = e.department_id            │     │
│     │ LEFT JOIN roles r ON r.id = e.role_id                        │     │
│     │ WHERE e.badge_token = ? AND e.status = 'active'              │     │
│     │   AND e.deleted_at IS NULL                                   │     │
│     └─────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  4. Fetch employee's current skills                                      │
│     ┌─────────────────────────────────────────────────────────────┐     │
│     │ SELECT es.*, s.name, sr.revision_label                       │     │
│     │ FROM employee_skills es                                      │     │
│     │ JOIN skills s ON s.id = es.skill_id                          │     │
│     │ JOIN skill_revisions sr ON sr.id = es.skill_revision_id      │     │
│     │ WHERE es.employee_id = ?                                     │     │
│     │   AND es.revoked_at IS NULL                                  │     │
│     │   AND (es.expires_at IS NULL OR es.expires_at > NOW())       │     │
│     └─────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  5. Render public skill viewer                                           │
│     ┌─────────────────────────────────────────────────────────────┐     │
│     │ ┌─────────────────────────────────────────────────────────┐ │     │
│     │ │  MARIA GARCIA                                           │ │     │
│     │ │  EMP-0042 • Austin Plant • Production                   │ │     │
│     │ ├─────────────────────────────────────────────────────────┤ │     │
│     │ │  ✅ Safety Protocols Rev B      Level 1   No Expiry     │ │     │
│     │ │  ✅ Injection Molding           Level 2   Dec 2027      │ │     │
│     │ │  ⚠️ Forklift Operation          Level 1   Jan 2026      │ │     │
│     │ └─────────────────────────────────────────────────────────┘ │     │
│     └─────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  Note: This page is PUBLIC — anyone with the QR code can view it.       │
│  The badgeToken is unguessable (21 char nanoid), providing security.    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Badge-Based Identification

### Why Two Identifiers?

| Field | `employeeNumber` | `badgeToken` |
|-------|-----------------|---------------|
| **Purpose** | HR/payroll integration | QR code URLs |
| **Format** | `EMP-0042` (human-readable) | `qR7xK9mN2pL5...` (random) |
| **Visibility** | Printed everywhere | Only in QR code |
| **Secrecy** | Not secret | Semi-secret* |
| **Stable?** | Yes (lifetime) | Can be regenerated |
| **Example use** | "Look up employee 0042" | "Scan badge to view skills" |

*The badge token is "semi-secret"—not intended for public sharing, but not a password either. It's like an unguessable URL.

### Badge Token Generation

```typescript
// src/lib/token.ts
import { nanoid } from 'nanoid';

// Generate a URL-safe, unguessable token
// 21 chars = ~126 bits of entropy (more than UUIDs)
export function generateBadgeToken(): string {
  return nanoid(21);  // e.g., "qR7xK9mN2pL5vX8tY3wA1"
}
```

### Token Regeneration

If a badge is lost or stolen, the token can be regenerated:

```typescript
// This invalidates the old badge QR code
await db.update(employees)
  .set({ badgeToken: generateBadgeToken() })
  .where(eq(employees.id, employeeId));

await logAudit('update', 'employee', employeeId, 
  { badgeToken: '[old token]' }, 
  { badgeToken: '[new token]' }
);
```

---

## Role-Based Access Control (RBAC)

### Role Definitions

| Role | Description | Typical Users |
|------|-------------|---------------|
| `admin` | Full system access, user management | IT, System Admins |
| `skill_manager` | Manage skills catalog & requirements | HR, Training Coordinators, Quality Managers |
| `trainer` | Certify employees on skills | Lead Technicians, Supervisors |
| `auditor` | Read-only access to all data | Compliance Officers, External Auditors |
| `viewer` | Read own skills only | Self-service employees |

### Permission Matrix

| Action | admin | skill_manager | trainer | auditor | viewer |
|--------|:-----:|:-------------:|:-------:|:-------:|:------:|
| **Users** | | | | | |
| Create/edit users | ✅ | | | | |
| Assign roles | ✅ | | | | |
| Disable users | ✅ | | | | |
| **Skills Catalog** | | | | | |
| Create skills | ✅ | ✅ | | | |
| Edit skills | ✅ | ✅ | | | |
| Manage revisions | ✅ | ✅ | | | |
| Archive skills | ✅ | ✅ | | | |
| **Requirements** | | | | | |
| Create requirements | ✅ | ✅ | | | |
| Edit requirements | ✅ | ✅ | | | |
| **Employees** | | | | | |
| Create employees | ✅ | ✅ | | | |
| Edit employees | ✅ | ✅ | | | |
| View all employees | ✅ | ✅ | ✅ | ✅ | |
| **Certifications** | | | | | |
| Certify employees | ✅ | ✅ | ✅ | | |
| Revoke certifications | ✅ | ✅ | | | |
| **Reports & Data** | | | | | |
| View skill matrix | ✅ | ✅ | ✅ | ✅ | |
| View gap analysis | ✅ | ✅ | ✅ | ✅ | |
| Export data | ✅ | ✅ | ✅ | ✅ | |
| **Audit** | | | | | |
| View audit logs | ✅ | | | ✅ | |
| **Self-Service** | | | | | |
| View own skills | ✅ | ✅ | ✅ | ✅ | ✅ |

### Implementation

```typescript
// src/lib/auth/permissions.ts
import { Session } from 'next-auth';

type AppRole = 'admin' | 'skill_manager' | 'trainer' | 'auditor' | 'viewer';

type Permission = 
  | 'users:manage'
  | 'skills:manage'
  | 'skills:view'
  | 'requirements:manage'
  | 'employees:manage'
  | 'employees:view'
  | 'certifications:create'
  | 'certifications:revoke'
  | 'matrix:view'
  | 'audit:view'
  | 'self:view';

const rolePermissions: Record<AppRole, Permission[]> = {
  admin: [
    'users:manage', 'skills:manage', 'skills:view', 'requirements:manage',
    'employees:manage', 'employees:view', 'certifications:create', 
    'certifications:revoke', 'matrix:view', 'audit:view', 'self:view'
  ],
  skill_manager: [
    'skills:manage', 'skills:view', 'requirements:manage',
    'employees:manage', 'employees:view', 'certifications:create',
    'certifications:revoke', 'matrix:view', 'self:view'
  ],
  trainer: [
    'skills:view', 'employees:view', 'certifications:create', 
    'matrix:view', 'self:view'
  ],
  auditor: [
    'skills:view', 'employees:view', 'matrix:view', 'audit:view', 'self:view'
  ],
  viewer: [
    'self:view'
  ],
};

export function hasPermission(session: Session | null, permission: Permission): boolean {
  if (!session?.user?.appRole) return false;
  const role = session.user.appRole as AppRole;
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function requirePermission(session: Session | null, permission: Permission): void {
  if (!hasPermission(session, permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
}
```

---

## Session Management

### NextAuth.js Configuration

```typescript
// src/auth.config.ts
import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@/db';
import { users, employees } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { verify } from 'argon2';

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.query.users.findFirst({
          where: and(
            eq(users.email, credentials.email as string),
            eq(users.status, 'active')
          ),
        });

        if (!user || !user.passwordHash) return null;

        const valid = await verify(user.passwordHash, credentials.password as string);
        if (!valid) return null;

        // Optionally fetch linked employee
        const employee = await db.query.employees.findFirst({
          where: and(
            eq(employees.userId, user.id),
            isNull(employees.deletedAt)
          ),
        });

        return {
          id: user.id,
          email: user.email,
          appRole: user.appRole,
          employeeId: employee?.id ?? null,
          employeeName: employee?.name ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.appRole = user.appRole;
        token.employeeId = user.employeeId;
        token.employeeName = user.employeeName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.appRole = token.appRole as string;
        session.user.employeeId = token.employeeId as string | null;
        session.user.employeeName = token.employeeName as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
```

### Middleware Protection

```typescript
// src/middleware.ts
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  
  // Public routes
  if (pathname.startsWith('/b/') ||  // Badge viewer
      pathname.startsWith('/login') ||
      pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }
  
  // Protected routes require auth
  if (pathname.startsWith('/admin')) {
    if (!req.auth) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    
    // Check if user is active
    if (req.auth.user?.status === 'disabled') {
      return NextResponse.redirect(new URL('/login?error=disabled', req.url));
    }
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

## Security Considerations

### Password Hashing

Use Argon2id (winner of the Password Hashing Competition):

```typescript
import { hash, verify } from 'argon2';

// Creating a new user
const passwordHash = await hash(password, {
  type: 2,  // argon2id
  memoryCost: 65536,  // 64 MB
  timeCost: 3,
  parallelism: 4,
});

// Verifying login
const valid = await verify(passwordHash, password);
```

### Badge Token Security

1. **Unguessable**: 21-char nanoid = ~126 bits of entropy
2. **No pattern**: Can't derive from employeeNumber
3. **Regeneratable**: If badge is lost, generate new token
4. **Rate-limited**: Limit requests to `/b/[token]` (see deployment.md)

### Session Security

1. **JWT or database sessions**: Configurable in NextAuth
2. **HTTPS only**: Cookies marked secure in production
3. **Session expiry**: Reasonable timeout (8 hours work shift)
4. **Account status**: Check `users.status` on each request

### Audit Trail

Every authentication event should be logged:

```typescript
await logAudit('login', 'user', userId, null, { 
  ip: req.ip, 
  userAgent: req.headers['user-agent'] 
});

await logAudit('logout', 'user', userId, null, null);

await logAudit('login_failed', 'user', null, null, { 
  email: attemptedEmail, 
  reason: 'invalid_password' 
});
```

---

## Implementation Checklist

### Phase 1: Core Auth (Week 1-2)
- [ ] Install NextAuth.js
- [ ] Create auth configuration
- [ ] Implement Credentials provider
- [ ] Set up Argon2 password hashing
- [ ] Create login page UI
- [ ] Implement middleware protection
- [ ] Add session provider to app

### Phase 2: RBAC (Week 2)
- [ ] Create permissions helper (`hasPermission`)
- [ ] Create `<RequireRole>` component
- [ ] Protect all admin routes
- [ ] Add role checks to Server Actions
- [ ] Create audit logging for auth events

### Phase 3: User Management (Week 2-3)
- [ ] Create `/admin/users` page
- [ ] Implement user CRUD operations
- [ ] Add role assignment UI
- [ ] Add user enable/disable
- [ ] Link users to employees (optional)

### Phase 4: Badge System (Week 3)
- [ ] Create badge token generation
- [ ] Create public badge viewer (`/b/[token]`)
- [ ] Add QR code generation
- [ ] Implement token regeneration
- [ ] Add rate limiting

### Phase 5: Quick Certify (Week 4)
- [ ] Create badge scanner UI
- [ ] Implement trainer certification flow
- [ ] Add mobile-optimized views
- [ ] Create certification audit logging
