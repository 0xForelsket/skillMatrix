# Authentication & Identity System - Issue Breakdown

This file defines the complete issue structure for implementing the authentication and identity
system in Caliber. Issues are organized hierarchically with clear dependencies.

**Import with:** `bd create -f .beads/auth-epic.md`

---

## EPIC: Authentication & Identity System

- type: epic
- priority: 0
- labels: auth, identity, security, phase-1

### Description

Implement the complete authentication and identity management system for Caliber, including:
- User authentication (email/password)
- Separation of Users (login) from Employees (business entities)
- Role-Based Access Control (RBAC)
- Badge-based identification for floor workers
- Session management and security

### Background & Context

Manufacturing environments have unique authentication requirements:

1. **Not everyone needs a login.** Floor workers (welders, machine operators) need their skills
   tracked but don't interact with the system directly. They're identified by badge scans.

2. **Some users aren't employees.** External auditors and consultants need system access but
   don't have HR records in the company.

3. **Visual verification is critical.** Supervisors must quickly verify worker qualifications
   by scanning a badge—no login, no searching, no waiting.

4. **Employee numbers are not secrets.** They're printed on badges, posted on training boards,
   used in payroll—they cannot serve as authentication credentials.

This leads to the core architectural decision: **Users ≠ Employees**. The `users` table handles
authentication (who can log in), while `employees` handles organizational tracking (HR records,
skills, certifications). They can be linked, but many employees have no login, and some users
have no employee record.

### Success Criteria

- [ ] Users can log in with email + password
- [ ] Passwords are hashed with Argon2id
- [ ] Session cookie is secure and HTTP-only
- [ ] All admin routes require authentication
- [ ] RBAC restricts actions based on user role
- [ ] Floor workers are identified by badge scan (no login)
- [ ] Public badge viewer shows skills without login
- [ ] Trainers can certify workers via badge scan
- [ ] Badge tokens can be regenerated if lost
- [ ] All auth events are logged for audit

### References

- [Auth Architecture Doc](docs/auth-architecture.md)
- [Schema Doc](docs/schema.md)
- [Roadmap Phase 1.5](docs/roadmap.md)

---

## Task: NextAuth.js Setup & Configuration

- type: task
- priority: 1
- labels: auth, nextauth, setup
- deps: []
- estimate: 120

### Description

Set up NextAuth.js v5 with the Credentials provider for email/password authentication.
This is the foundational auth layer that all other auth features depend on.

### Background & Reasoning

We're using NextAuth.js (Auth.js) because:
- First-class Next.js App Router support
- Handles session management automatically
- JWT or database sessions (we'll use JWT for stateless scaling)
- Built-in CSRF protection
- Easy to add SSO providers later

We're starting with Credentials provider (email/password) because:
- Most manufacturing environments don't have SSO
- Simple to implement and understand
- Can add OIDC/SAML later via additional providers

### Subtasks

- [ ] Install `next-auth@beta` and `@auth/drizzle-adapter` packages
- [ ] Create `src/auth.ts` with NextAuth configuration
- [ ] Create `src/auth.config.ts` for edge-compatible config
- [ ] Set up Credentials provider with email/password
- [ ] Configure JWT session strategy
- [ ] Add `NEXTAUTH_SECRET` to environment variables
- [ ] Create `src/app/api/auth/[...nextauth]/route.ts` handler
- [ ] Add `SessionProvider` to root layout

### Acceptance Criteria

```gherkin
Given a properly configured NextAuth setup
When the app starts
Then the /api/auth endpoints are accessible
And session state can be read with getServerSession()
```

### Technical Notes

- Use NextAuth v5 (beta) for App Router support
- Configure edge-compatible `auth.config.ts` for middleware
- Set `trustHost: true` for production behind reverse proxy
- JWT strategy preferred over database sessions for horizontal scaling

### Dependencies

None - this is a foundational task.

---

## Task: Argon2 Password Hashing

- type: task
- priority: 1
- labels: auth, security, passwords
- deps: []
- estimate: 60

### Description

Implement secure password hashing using Argon2id, the winner of the Password Hashing Competition.
This ensures even if the database is compromised, passwords remain protected.

### Background & Reasoning

Why Argon2id over bcrypt:
- Argon2 won the Password Hashing Competition (2015)
- Memory-hard: resists GPU/ASIC attacks
- Argon2id combines Argon2i (side-channel resistance) and Argon2d (GPU resistance)
- Recommended by OWASP for new applications

The `argon2` npm package is a Node.js binding to the reference C implementation.

### Subtasks

- [ ] Install `argon2` package
- [ ] Create `src/lib/auth/password.ts` with hash/verify functions
- [ ] Configure parameters: memoryCost=65536 (64MB), timeCost=3, parallelism=4
- [ ] Add type exports for password functions
- [ ] Create unit tests for hash/verify

### Acceptance Criteria

```gherkin
Given a plaintext password "correcthorsebatterystaple"
When I hash it with hashPassword()
Then the result starts with "$argon2id$"
And verifyPassword(hash, "correcthorsebatterystaple") returns true
And verifyPassword(hash, "wrongpassword") returns false
```

### Technical Notes

```typescript
// Recommended parameters (OWASP 2024)
const options = {
  type: 2,           // argon2id
  memoryCost: 65536, // 64 MB - increase if server allows
  timeCost: 3,       // iterations
  parallelism: 4,    // threads
};
```

### Dependencies

None - this is a foundational task.

---

## Task: User Database Operations

- type: task
- priority: 1
- labels: auth, database, users
- deps: [auth-password-hashing]
- estimate: 90

### Description

Create Server Actions for user CRUD operations: create, read, update, and status management.
These operations will be used by the user management UI and the auth system.

### Background & Reasoning

User operations are intentionally separate from employee operations because:
- Users are about authentication and permissions
- Employees are about HR records and skill tracking
- Not all users are employees (external auditors)
- Not all employees are users (floor workers)

We implement as Server Actions (not API routes) because:
- Type-safe end-to-end
- Automatic request validation
- Better error handling
- Simpler mental model

### Subtasks

- [ ] Create `src/actions/users.ts` file
- [ ] Implement `createUser(email, password, appRole)` action
- [ ] Implement `getUserById(id)` action
- [ ] Implement `getUserByEmail(email)` action
- [ ] Implement `updateUser(id, data)` action
- [ ] Implement `updateUserStatus(id, status)` action (enable/disable)
- [ ] Implement `updateUserPassword(id, newPassword)` action
- [ ] Add Zod schemas for input validation
- [ ] Integrate audit logging for all mutations
- [ ] Add unit tests for user operations

### Acceptance Criteria

```gherkin
Given I call createUser with valid data
When the operation completes
Then a new user exists in the database with hashed password
And an audit log entry is created
And the returned user object does NOT include the passwordHash
```

### Technical Notes

- Always hash passwords before storing
- Never return passwordHash from any function
- Check email uniqueness before insert
- Soft deletes are not implemented for users (they're disabled instead)
- All mutations require audit logging

### Dependencies

- `auth-password-hashing` - Need Argon2 for password hashing

---

## Task: Login Page UI

- type: task
- priority: 1
- labels: auth, ui, login
- deps: [nextauth-setup]
- estimate: 120

### Description

Create the login page with email/password form, error handling, and proper UX.
This is the entry point for all authenticated users.

### Background & Reasoning

The login page should be:
- Simple and focused (manufacturing environment, often on shared terminals)
- Clear error messages (wrong password vs. disabled account)
- Mobile-friendly (tablets on the floor)
- Accessible (proper labels, focus management)

We're NOT implementing:
- "Remember me" (shared terminals)
- Social login (no SSO in most plants)
- Self-registration (admins create accounts)
- Password reset (v1 - admins reset manually)

### Subtasks

- [ ] Create `src/app/login/page.tsx`
- [ ] Create login form component with email/password fields
- [ ] Add form validation (client-side)
- [ ] Integrate with NextAuth signIn function
- [ ] Handle error states (invalid credentials, disabled account, network error)
- [ ] Add loading state during authentication
- [ ] Redirect to `/admin` on success
- [ ] Redirect back to original URL if accessed from protected route
- [ ] Style with company branding (professional, clean)
- [ ] Add accessibility: labels, aria attributes, focus management

### Acceptance Criteria

```gherkin
Given I navigate to /login
When I enter valid credentials and submit
Then I am redirected to /admin
And a session cookie is set

Given I navigate to /login
When I enter invalid credentials
Then I see "Invalid email or password" error
And I remain on the login page

Given I try to access /admin without a session
When I am redirected to /login
Then after successful login I am sent back to /admin
```

### Technical Notes

- Use `signIn("credentials", { ... })` from `next-auth/react`
- Handle `CredentialsSignin` error specifically
- Don't reveal whether email exists (security)
- Clear password field on error

### Dependencies

- `nextauth-setup` - Need NextAuth configured

---

## Task: Middleware Route Protection

- type: task
- priority: 1
- labels: auth, middleware, security
- deps: [nextauth-setup]
- estimate: 60

### Description

Create middleware to protect admin routes, requiring authentication.
Public routes (badge viewer) remain accessible without login.

### Background & Reasoning

Route protection strategy:
- `/admin/*` - Requires authentication
- `/b/*` - Public (badge viewer)
- `/login` - Public (obvious)
- `/api/auth/*` - Public (NextAuth endpoints)

We use Next.js middleware because:
- Runs at the edge, before the page renders
- Can redirect before any server code executes
- Single place to enforce auth requirements

### Subtasks

- [ ] Create `src/middleware.ts`
- [ ] Import `auth` from NextAuth config
- [ ] Define public route patterns
- [ ] Redirect unauthenticated requests to `/login`
- [ ] Preserve original URL for post-login redirect
- [ ] Check user status (disabled users can't access)
- [ ] Configure matcher to exclude static files

### Acceptance Criteria

```gherkin
Given I am not logged in
When I navigate to /admin/employees
Then I am redirected to /login?callbackUrl=/admin/employees

Given I am logged in with an active account
When I navigate to /admin/employees
Then I see the employees page

Given I am logged in but my account is disabled
When I navigate to /admin/employees
Then I am redirected to /login?error=disabled
```

### Technical Notes

```typescript
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|b/).*)'],
};
```

### Dependencies

- `nextauth-setup` - Need auth helper from NextAuth

---

## Task: RBAC Permission System

- type: task
- priority: 1
- labels: auth, rbac, permissions
- deps: [user-database-operations]
- estimate: 150

### Description

Implement Role-Based Access Control with a permission system that maps roles to allowed actions.
This is critical for security - trainers shouldn't manage users, auditors shouldn't modify data.

### Background & Reasoning

The five roles with their intended use:

| Role | Description | Typical Users |
|------|-------------|---------------|
| admin | Full access, user management | IT, System Admins |
| skill_manager | Manage skills catalog & requirements | HR, Training Coordinators, Quality Managers |
| trainer | Certify employees | Lead Technicians, Supervisors |
| auditor | Read-only all data, audit logs | Compliance, External Auditors |
| viewer | Read own skills only | Self-service employees |

Design decisions:
- Permissions are defined by code, not database (simpler, auditable)
- Checking happens server-side (never trust client)
- UI can use permissions to hide buttons (UX), but server enforces

### Subtasks

- [ ] Create `src/lib/auth/permissions.ts`
- [ ] Define Permission type union
- [ ] Create rolePermissions mapping
- [ ] Implement `hasPermission(session, permission)` function
- [ ] Implement `requirePermission(session, permission)` function (throws)
- [ ] Create `<RequireRole>` React component for UI gating
- [ ] Create `usePermissions()` hook for client components
- [ ] Add permission checks to all Server Actions
- [ ] Document permission matrix in JSDoc

### Acceptance Criteria

```gherkin
Given a user with role "trainer"
When checking hasPermission(session, 'certifications:create')
Then it returns true

Given a user with role "trainer"
When checking hasPermission(session, 'users:manage')
Then it returns false

Given a user with role "auditor"
When attempting to call createEmployee() Server Action
Then the action throws PermissionDenied error
```

### Technical Notes

Permission naming convention: `entity:action`
- `users:manage` - Create, edit, disable users
- `skills:manage` - Create, edit skills and revisions
- `certifications:create` - Certify employees
- `certifications:revoke` - Revoke certifications
- `matrix:view` - View skill matrix
- `audit:view` - View audit logs
- `self:view` - View own skills only

### Dependencies

- `user-database-operations` - Need user data structure

---

## Task: Session Context & Hooks

- type: task
- priority: 2
- labels: auth, react, session
- deps: [nextauth-setup, rbac-permission-system]
- estimate: 90

### Description

Create React context and hooks for accessing session data and permissions throughout the app.
This provides a clean API for components to check auth state.

### Background & Reasoning

We need convenient access to:
- Current user data (id, email, role, name)
- Linked employee data (if user is also an employee)
- Permission checks (can this user do X?)
- Auth state (loading, authenticated, unauthenticated)

Design: Use NextAuth's built-in `useSession()` hook, but wrap it with our custom hooks
for permission checking and typed access.

### Subtasks

- [ ] Create `src/lib/auth/hooks.ts`
- [ ] Create `useCurrentUser()` hook with typed return
- [ ] Create `usePermissions()` hook returning permission check functions
- [ ] Create `useRequireAuth()` hook that redirects if not authenticated
- [ ] Extend NextAuth types in `src/types/next-auth.d.ts`
- [ ] Add employee data to session (if user is linked to employee)
- [ ] Add unit tests for hooks

### Acceptance Criteria

```gherkin
Given I am logged in as a trainer
When I call useCurrentUser()
Then I get { id, email, appRole: 'trainer', employeeId, employeeName }

Given I am logged in as a trainer
When I call usePermissions()
Then can('certifications:create') returns true
And can('users:manage') returns false
```

### Technical Notes

Type extension for NextAuth:
```typescript
// src/types/next-auth.d.ts
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      appRole: string;
      employeeId: string | null;
      employeeName: string | null;
    }
  }
}
```

### Dependencies

- `nextauth-setup` - Need session provider
- `rbac-permission-system` - Need permission checks

---

## Task: User Management Page

- type: task
- priority: 2
- labels: auth, ui, admin
- deps: [rbac-permission-system, user-database-operations, login-page-ui]
- estimate: 180

### Description

Create the admin page for managing users: listing, creating, editing, and disabling user accounts.
Admin-only access.

### Background & Reasoning

User management is separate from employee management because:
- Users = login credentials + permissions
- Employees = HR records + skill tracking

This page is for IT admins to:
- Create accounts for trainers, managers, auditors
- Assign appropriate roles
- Disable accounts when people leave
- Optionally link a user to an employee record

We DON'T implement password reset in v1 - admins set a temporary password directly.

### Subtasks

- [ ] Create `src/app/admin/users/page.tsx`
- [ ] Create users data table with columns: email, role, status, created, linked employee
- [ ] Add search and filter (by role, status)
- [ ] Create "Add User" dialog with email, password, role fields
- [ ] Create "Edit User" dialog for role changes
- [ ] Add "Disable/Enable" action with confirmation
- [ ] Add "Reset Password" action (admin sets new password)
- [ ] Add "Link to Employee" dropdown (optional)
- [ ] Add RBAC check: only admin role can access
- [ ] Add audit logging for all user changes

### Acceptance Criteria

```gherkin
Given I am logged in as admin
When I navigate to /admin/users
Then I see a list of all users

Given I am logged in as trainer
When I navigate to /admin/users
Then I see a "Permission Denied" message

Given I create a new user with role "trainer"
When the operation completes
Then the user appears in the list
And they can log in with those credentials
And an audit log entry exists
```

### Technical Notes

- Use Shadcn DataTable for the user list
- Use Dialog for create/edit forms
- Server Actions for all mutations
- toast notifications for success/error

### Dependencies

- `rbac-permission-system` - Need admin-only access
- `user-database-operations` - Need CRUD operations
- `login-page-ui` - Need login to test user creation

---

## Task: Badge Token Generation

- type: task
- priority: 1
- labels: identity, badges, security
- deps: []
- estimate: 45

### Description

Create the badge token generation utility using nanoid for secure, URL-safe tokens.
These tokens are embedded in QR codes for the public skill viewer.

### Background & Reasoning

Why a separate badge token instead of using employee number?

| Aspect | employeeNumber | badgeToken |
|--------|---------------|------------|
| Purpose | HR identifier | QR code URL |
| Visibility | Printed everywhere | Only in QR |
| Secrecy | Not secret | Semi-secret |
| Format | EMP-0042 | qR7xK9mN2pL5... |
| Stable? | Lifetime | Regeneratable |

If a badge is lost, we can regenerate the token, invalidating the old QR code
while keeping the employee's HR number unchanged.

nanoid is used because:
- URL-safe alphabet (no encoding needed)
- 21 chars = ~126 bits of entropy (more than UUID)
- Collision probability effectively zero
- Small library, fast

### Subtasks

- [ ] Install `nanoid` package
- [ ] Create `src/lib/token.ts`
- [ ] Implement `generateBadgeToken()` returning 21-char string
- [ ] Add JSDoc explaining security properties
- [ ] Add unit test verifying length and character set

### Acceptance Criteria

```gherkin
Given I call generateBadgeToken()
Then I get a 21-character string
And it contains only URL-safe characters (a-z, A-Z, 0-9, -, _)
And calling it again gives a different value
```

### Technical Notes

```typescript
import { nanoid } from 'nanoid';
export const generateBadgeToken = () => nanoid(21);
```

The default nanoid alphabet is: A-Za-z0-9_-

### Dependencies

None - this is a utility function.

---

## Task: Public Badge Viewer Page

- type: task
- priority: 1
- labels: identity, badges, ui, public
- deps: [badge-token-generation]
- estimate: 150

### Description

Create the public page that displays an employee's skills when their badge is scanned.
No authentication required - accessible by anyone with the QR code URL.

### Background & Reasoning

This is the primary way supervisors and auditors verify worker qualifications:
1. Scan badge QR code with phone camera
2. Phone opens URL: `https://skills.company.com/b/qR7xK9mN...`
3. See employee name, photo, department, and all current skills
4. Verify worker is qualified for the task

Design considerations:
- Mobile-first (phones scanning QR codes)
- Fast loading (factory floor, limited connectivity)
- No login required (anyone with QR can view)
- Read-only (no edit actions)
- Clear skill status (valid/expiring/missing)

### Subtasks

- [ ] Create `src/app/(public)/b/[badgeToken]/page.tsx`
- [ ] Create route group `(public)` without admin layout
- [ ] Fetch employee by badgeToken
- [ ] Handle 404 if token not found or employee terminated
- [ ] Display employee header: name, photo, department, role, site
- [ ] Fetch and display employee skills
- [ ] Show skill status badges: Valid (green), Expiring Soon (yellow)
- [ ] Show level as "achieved/max" (e.g., "2/3")
- [ ] Show certification date and expiry
- [ ] Mobile-responsive design
- [ ] Add "Scanned at [timestamp]" footer
- [ ] Add meta tags for Open Graph (preview when sharing)

### Acceptance Criteria

```gherkin
Given an employee with badgeToken "qR7xK9mN..."
When I navigate to /b/qR7xK9mN...
Then I see the employee's name, photo, and skills
And I do NOT see any edit buttons or admin links

Given a badgeToken that doesn't exist
When I navigate to /b/invalid123
Then I see a 404 page

Given an employee who is terminated
When I navigate to their badge URL
Then I see "This badge is no longer valid"
```

### Technical Notes

- Use Suspense for loading state
- Cache employee data (skills change infrequently)
- Consider offline caching for return visits
- Rate limit this endpoint (see deployment.md)

### Dependencies

- `badge-token-generation` - Need token format understanding

---

## Task: QR Code Generation

- type: task
- priority: 2
- labels: identity, badges, qr
- deps: [public-badge-viewer-page]
- estimate: 90

### Description

Implement QR code generation for employee badges. The QR code contains the badge viewer URL
and can be downloaded as an image or printed directly.

### Background & Reasoning

QR codes are the primary interface between floor workers and the system:
- Trainer scans worker badge → certifies them
- Supervisor scans worker badge → verifies qualifications
- Worker scans own badge → sees their skills

The QR should:
- Contain the full URL: `https://skills.company.com/b/{badgeToken}`
- Be appropriately sized for badge printing
- Have error correction (badges get worn)
- Be downloadable as PNG for external printing systems

### Subtasks

- [ ] Install `qrcode` package
- [ ] Create `src/lib/qr.ts` with QR generation function
- [ ] Create API route for QR image: `/api/employees/[id]/badge-qr`
- [ ] Generate QR with high error correction (L25%)
- [ ] Add "Download Badge QR" button on employee detail page
- [ ] Create print-friendly badge layout (optional PDF)
- [ ] Add batch download for multiple employees

### Acceptance Criteria

```gherkin
Given an employee with badgeToken "qR7xK9mN..."
When I click "Download Badge QR"
Then I receive a PNG image
And scanning it with a phone opens /b/qR7xK9mN...
```

### Technical Notes

```typescript
import QRCode from 'qrcode';

const generateBadgeQR = async (badgeToken: string, baseUrl: string) => {
  const url = `${baseUrl}/b/${badgeToken}`;
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',  // 15% recovery
    margin: 2,
    width: 300,
  });
};
```

### Dependencies

- `public-badge-viewer-page` - Need the page that QR links to

---

## Task: Badge Token Regeneration

- type: task
- priority: 2
- labels: identity, badges, security
- deps: [badge-token-generation, user-database-operations]
- estimate: 60

### Description

Implement the ability to regenerate an employee's badge token, invalidating their old QR code.
Used when a badge is lost, stolen, or needs security rotation.

### Background & Reasoning

Security scenario:
1. Employee loses their badge
2. Admin regenerates their badge token
3. Old QR code (on lost badge) stops working
4. New badge is printed with new QR
5. Audit log records the change

This is better than just the "lost and found" approach because:
- Old QR is immediately invalid (security)
- No need to track "revoked" badges
- Simple implementation

### Subtasks

- [ ] Create `regenerateBadgeToken(employeeId)` Server Action
- [ ] Generate new token using `generateBadgeToken()`
- [ ] Update employee record
- [ ] Create audit log entry with old token (masked) and new token
- [ ] Add "Regenerate Badge" button on employee detail page
- [ ] Add confirmation dialog warning that old badge will stop working
- [ ] Require skill_manager or admin role

### Acceptance Criteria

```gherkin
Given employee with badgeToken "oldToken123..."
When admin clicks "Regenerate Badge" and confirms
Then employee has a new badgeToken
And /b/oldToken123... returns 404
And /b/[newToken] shows the employee
And audit log contains the regeneration event
```

### Technical Notes

- Never log the full old token (mask: "oldTo...23")
- Confirmation should be explicit (not recoverable)
- Consider sending new badge QR to admin's email (future enhancement)

### Dependencies

- `badge-token-generation` - Need token generation
- `user-database-operations` - Pattern for Server Actions with audit

---

## Task: Quick Certify Scanner Flow

- type: task
- priority: 1
- labels: certification, badges, trainer, mobile
- deps: [public-badge-viewer-page, rbac-permission-system]
- estimate: 240

### Description

Implement the trainer workflow for certifying employees via badge scan.
This is the primary way skills are recorded in the system.

### Background & Reasoning

The certification flow on the factory floor:
1. Training session completes
2. Trainer opens tablet/phone
3. Selects skill to certify (e.g., "Injection Molding 101")
4. Scans each trainee's badge QR code
5. For each: confirms level achieved, adds optional notes
6. Submits certification

Design priorities:
- Mobile-first (tablets on the floor)
- Fast (batch certify 20 people after a class)
- Minimal typing (select, scan, confirm)
- Works offline (queue and sync later)

### Subtasks

- [ ] Create `/admin/certify` page (trainer view)
- [ ] Create skill selector (search/filter active skills)
- [ ] Show skill details: name, revision, max level
- [ ] Implement badge scanner input (camera or barcode reader)
- [ ] On scan: lookup employee, show name and photo
- [ ] Show employee's current status for this skill
- [ ] Create level selector (1 to maxLevel)
- [ ] Add optional notes field
- [ ] Create "Certify" button with confirmation
- [ ] Implement `certifyEmployee(employeeId, skillId, revisionId, level, notes)` Server Action
- [ ] Calculate expiresAt from skill's validityMonths
- [ ] Create audit log entry with certifier info
- [ ] Add batch mode: queue multiple certifications before submit
- [ ] Mobile-optimized layout (large touch targets)
- [ ] Add success/error toast notifications

### Acceptance Criteria

```gherkin
Given I am logged in as trainer
When I select "Injection Molding 101" and scan employee badge
Then I see the employee's name and current skill status
When I select level 2 and click Certify
Then a new employeeSkills record is created
And the employee shows "Valid" for this skill
And an audit log entry records the certification
```

### Technical Notes

For badge scanning, support both:
- Camera-based scanning (mobile)
- USB barcode reader (desktop)

Both input the URL, extract the token, and lookup the employee.

### Dependencies

- `public-badge-viewer-page` - Need badge token lookup
- `rbac-permission-system` - Need trainer role check

---

## Task: Auth Event Audit Logging

- type: task
- priority: 2
- labels: auth, audit, security
- deps: [nextauth-setup, user-database-operations]
- estimate: 60

### Description

Log all authentication-related events to the audit log for security and compliance.
This includes logins, logouts, failed attempts, and permission violations.

### Background & Reasoning

Compliance requirements often mandate:
- Track who logged in and when
- Track failed login attempts (potential attacks)
- Track administrative actions on user accounts
- Maintain logs for N years

We log to the same `audit_logs` table as business events for simplicity.

### Subtasks

- [ ] Create auth event types: 'login', 'logout', 'login_failed', 'permission_denied'
- [ ] Add callback in NextAuth to log successful logins
- [ ] Log failed login attempts (without revealing if email exists)
- [ ] Log session termination (logout)
- [ ] Log permission denied events from requirePermission()
- [ ] Include IP address and user agent where available
- [ ] Create query helper for auth event reports

### Acceptance Criteria

```gherkin
Given I successfully log in
When I check audit logs
Then there is a 'login' entry with my userId, timestamp, and IP

Given I fail to log in with wrong password
When I check audit logs
Then there is a 'login_failed' entry with the attempted email (not userId)
And it does NOT reveal whether the email exists
```

### Technical Notes

For failed logins, log:
- `userId: null` (don't reveal if email exists)
- `entityType: 'auth'`
- `action: 'login_failed'`
- `newValue: { email: attempt.email, reason: 'invalid_credentials', ip, userAgent }`

### Dependencies

- `nextauth-setup` - Need auth events to log
- `user-database-operations` - Need audit logging pattern

---

## Task: Disabled Account Handling

- type: task
- priority: 2
- labels: auth, security, ux
- deps: [login-page-ui, middleware-route-protection]
- estimate: 45

### Description

Handle the case where a user's account has been disabled by an admin.
They should not be able to log in, and active sessions should be invalidated.

### Background & Reasoning

When an employee leaves or is terminated:
1. Admin disables their user account
2. They can no longer log in
3. Any active sessions are invalidated
4. Clear messaging explains what happened

Session invalidation is tricky with JWT (stateless). Options:
- Short JWT expiry + check status on each request (recommended)
- Maintain a blacklist of revoked JWTs (complex)
- Switch to database sessions (stateful)

We'll use short JWT + status check approach.

### Subtasks

- [ ] Add status check in NextAuth authorize callback
- [ ] Add status check in middleware for every request
- [ ] Return specific error code for disabled accounts
- [ ] Show clear message on login page: "Your account has been disabled"
- [ ] Add "Contact administrator" guidance
- [ ] Set reasonable JWT expiry (8 hours - shift length)
- [ ] Log disabled user access attempts

### Acceptance Criteria

```gherkin
Given my account status is 'disabled'
When I try to log in
Then I see "Your account has been disabled. Contact your administrator."

Given I am logged in with an active session
When admin disables my account
And I navigate to a new page
Then I am logged out and see the disabled message
```

### Technical Notes

In middleware, always check:
```typescript
if (session?.user?.status === 'disabled') {
  return redirect('/login?error=disabled');
}
```

### Dependencies

- `login-page-ui` - Need login page for error display
- `middleware-route-protection` - Need middleware for status check

---

## Task: Employee-User Linking

- type: task
- priority: 2
- labels: identity, users, employees
- deps: [user-management-page]
- estimate: 90

### Description

Implement the ability to link a user account to an employee record.
This allows trainers/managers who are also tracked employees to see their own skills.

### Background & Reasoning

The link is optional and bidirectional benefit:
- User → Employee: "View my own skills" feature
- Employee → User: Identify who certified (linked user gets name)

Not all links make sense:
- External auditor (user) should NOT be linked to employee
- Floor worker (employee) should NOT have a user account

The link is `employees.userId` (nullable FK).

### Subtasks

- [ ] Add "Link to Employee" field in user creation form
- [ ] Create employee search/select dropdown
- [ ] Validate: employee not already linked to another user
- [ ] Add "Linked Employee" column in users table
- [ ] Add employee data to session (name, id) when linked
- [ ] Create "My Skills" page for linked users
- [ ] Add "Unlink Employee" action

### Acceptance Criteria

```gherkin
Given I create a user and link to employee "Maria Garcia"
When Maria logs in
Then her session includes employeeId and employeeName
And she can view her own skill record at /admin/my-skills

Given employee "John" is already linked to user A
When I try to link user B to employee "John"
Then I see error "This employee is already linked to another user"
```

### Technical Notes

The link is stored on the employee side:
```sql
UPDATE employees SET user_id = ? WHERE id = ?
```

Session includes:
```typescript
{
  user: {
    id: 'usr_...',
    email: 'maria@...',
    appRole: 'trainer',
    employeeId: 'emp_...',  // From link
    employeeName: 'Maria Garcia',  // From link
  }
}
```

### Dependencies

- `user-management-page` - Need user UI to add linking

---

## Task: Integration Tests for Auth Flow

- type: task
- priority: 2
- labels: auth, testing, integration
- deps: [login-page-ui, middleware-route-protection, rbac-permission-system]
- estimate: 120

### Description

Create integration tests covering the complete authentication flow:
login, session management, route protection, and permission enforcement.

### Background & Reasoning

Auth is security-critical and must be tested thoroughly:
- Correct credentials → access granted
- Wrong credentials → access denied
- Missing session → redirect to login
- Wrong role → permission denied
- Disabled account → access revoked

We use Playwright for E2E because it can:
- Fill forms and click buttons
- Verify redirects
- Check cookies
- Test the full Next.js stack

### Subtasks

- [ ] Set up test database with known user credentials
- [ ] Create login success test
- [ ] Create login failure test (wrong password)
- [ ] Create login failure test (disabled account)
- [ ] Create protected route redirect test
- [ ] Create RBAC test: trainer can certify, cannot manage users
- [ ] Create RBAC test: auditor can view, cannot modify
- [ ] Create session expiry test
- [ ] Create logout test
- [ ] Add tests to CI pipeline

### Acceptance Criteria

```gherkin
Given test suite runs
When all auth tests execute
Then login flows pass
And RBAC restrictions are enforced
And no security regressions exist
```

### Technical Notes

Create test fixtures:
```typescript
const testUsers = {
  admin: { email: 'admin@test.local', password: 'admin123' },
  trainer: { email: 'trainer@test.local', password: 'trainer123' },
  auditor: { email: 'auditor@test.local', password: 'auditor123' },
  disabled: { email: 'disabled@test.local', password: 'disabled123' },
};
```

### Dependencies

- `login-page-ui` - Need login page to test
- `middleware-route-protection` - Need protection to verify
- `rbac-permission-system` - Need permissions to test

---
