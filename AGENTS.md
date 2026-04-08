# AGENTS.md

## Project

Timewise - attendance tracking SaaS

## Goal

Modernize and standardize the frontend UI into a premium enterprise dashboard experience without breaking business logic.

---

## Tech Stack

* Next.js (App Router)
* TypeScript
* Supabase (Postgres + Auth + RLS)
* Tailwind CSS

---

## Architecture

* Multi-tenant SaaS
* Each user belongs to a company
* Company-scoped roles:

  * `admin`
  * `employee`
* Platform admin (me) handles company onboarding manually

---

## Tech Expectations

* Preserve existing app architecture where reasonable
* Prefer reusable components over page-specific hacks
* Keep code readable and maintainable
* Do not change backend behavior unless required for UI integration
* Respect existing auth, data fetching, and business rules

---

## UI Direction

* clean enterprise SaaS
* light theme
* left sidebar + top header
* subtle borders, neutral palette, polished cards/tables/forms
* strong spacing and typography consistency
* responsive and accessible

---

## Backend & Security Rules (CRITICAL)

### Multi-tenant safety

* Never trust client-supplied `company_id`
* Always derive company context from the authenticated user
* All queries must be scoped to the user’s company

### Roles & permissions

* Roles are company-scoped, not global
* `admin` can only act within their own company
* `admin` can invite **employees only** (not other admins)
* `employee` cannot invite users

### Supabase / RLS

* Enforce access control using Row Level Security (RLS)
* Never bypass RLS unless explicitly required
* RLS policies must prevent cross-tenant access
* Users must not read or modify data from other companies

### Invitations

* Invitations must always belong to a company
* Only admins of that company can create invites
* Do not allow role escalation via invites
* Store invite tokens as hashed values only
* Validate all invites server-side

---

## Data & Auth Conventions

* Users stored in `auth.users`
* Profiles stored in `profiles`
* Company relationships via `company_memberships`
* Invitations stored in `invitations`

---

## Conventions

* Use server actions or route handlers for mutations
* Validate all inputs with Zod
* Prefer server-side logic over client-side Supabase calls
* Use TypeScript strictly (no `any`)
* Keep components reusable and composable

---

## Priorities

1. Shared layout/app shell
2. Design system components
3. Dashboard
4. Attendance logs
5. Employee management
6. Leave requests
7. Settings and onboarding (includes invite system)

---

## Rules

* Do not remove working features
* Do not rewrite unrelated logic
* Improve consistency before adding complexity
* Favor maintainable refactors
* Keep the UI calm, premium, and business-ready

---

## Workflow

* First audit the current UI structure
* Then propose a concise implementation plan
* Then execute the redesign in phases
* After each phase, verify existing flows still work

---

## Before Completing Any Task

* Ensure no cross-tenant data leaks
* Ensure permissions are enforced server-side
* Ensure RLS policies are respected
* Ensure no privilege escalation is possible
