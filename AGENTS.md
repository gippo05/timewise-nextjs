# AGENTS.md

## Project
Timewise - attendance tracking SaaS

## Goal
Modernize and standardize the frontend UI into a premium enterprise dashboard experience without breaking business logic.

## Tech Expectations
- Preserve existing app architecture where reasonable
- Prefer reusable components over page-specific hacks
- Keep code readable and maintainable
- Do not change backend behavior unless required for UI integration
- Respect existing auth, data fetching, and business rules

## UI Direction
- clean enterprise SaaS
- light theme
- left sidebar + top header
- subtle borders, neutral palette, polished cards/tables/forms
- strong spacing and typography consistency
- responsive and accessible

## Priorities
1. Shared layout/app shell
2. Design system components
3. Dashboard
4. Attendance logs
5. Employee management
6. Leave requests
7. Settings and onboarding

## Rules
- Do not remove working features
- Do not rewrite unrelated logic
- Improve consistency before adding complexity
- Favor maintainable refactors
- Keep the UI calm, premium, and business-ready

## Workflow
- First audit the current UI structure
- Then propose a concise implementation plan
- Then execute the redesign in phases
- After each phase, verify existing flows still work