# Tasks: 사적 재판 시스템

**Input**: Design documents from `/home/sungjin/workspace/private_judge/specs/001-ai-a-b/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Next.js App Router**: `app/`, `core/`, `data/`, `components/` at repository root
- **Supabase**: `supabase/` for Edge Functions and migrations
- **Tests**: `tests/` for all test categories

## A. 부트스트랩 (Setup)

- [x] T001 Initialize Next.js 15 project with App Router and TypeScript
- [x] T002 [P] Configure Tailwind CSS with monochrome theme and single accent color
- [x] T003 [P] Setup project structure (/core, /data, /app, /components, /supabase)
- [x] T004 [P] Configure linting and formatting tools (ESLint, Prettier, zero errors target)
- [x] T005 [P] Setup environment variables (.env.local template with Supabase and OpenAI keys)

## B. 기본 UI 컴포넌트 (Core Components)

- [x] T006 [P] Create basic layout component in components/layout/layout.tsx
- [x] T007 [P] Create Stepper component in components/ui/stepper.tsx
- [x] T008 [P] Create status Badge component in components/ui/badge.tsx
- [x] T009 [P] Create Timeline component in components/ui/timeline.tsx
- [x] T010 [P] Create Korean language constants in core/constants/messages.ts

## C. Supabase 데이터베이스 구성

- [x] T011 Initialize Supabase project and configure connection in data/supabase/client.ts
- [x] T012 Create database schema migration in supabase/migrations/001_initial_schema.sql
  - users (profile extension), rooms, room_members, motions, claims, arguments
  - rounds, debate_turns, judge_decisions, juror_profiles, jury_votes
  - final_reports, jobs table
- [x] T013 Create RLS policies in supabase/migrations/002_rls_policies.sql
  - room_members based access control
  - service_role only for system operations
- [x] T014 [P] Create database query functions in data/supabase/queries.ts
- [x] T015 [P] Create seed data script in supabase/seed.sql

## D. Supabase Edge Functions

- [x] T016 [P] Create jobs-worker Edge Function in supabase/functions/jobs-worker/index.ts
  - Queue processing with LLM calls, parsing, storage
  - Retry logic with exponential backoff
- [x] T017 [P] Create jury-batch Edge Function in supabase/functions/jury-batch/index.ts
  - Parallel execution of 7 jury members
- [x] T018 [P] Create report-finalize Edge Function in supabase/functions/report-finalize/index.ts
  - Final report aggregation and completion

## E. 인증 시스템 (Auth with REST)

- [x] T019 Create auth utilities in data/supabase/auth.ts (GoTrue REST integration)
- [x] T020 Create login Route Handler in app/api/auth/login/route.ts
- [x] T021 Create callback Route Handler in app/api/auth/callback/route.ts
- [x] T022 Create logout Route Handler in app/api/auth/logout/route.ts
- [x] T023 Create auth middleware in app/middleware.ts (JWT verification with jose/JWKS)
- [x] T024 [P] Create auth pages in app/(auth)/login/page.tsx and app/(auth)/callback/page.tsx

## F. 계약 테스트 (Contract Tests) ⚠️ MUST COMPLETE BEFORE API IMPLEMENTATION

- [x] T025 [P] Contract test for rooms API in tests/contract/rooms-api.test.ts
- [x] T026 [P] Contract test for debates API in tests/contract/debates-api.test.ts
- [x] T027 [P] Contract test for jobs API in tests/contract/jobs-api.test.ts
- [x] T028 [P] LLM response schema validation tests in tests/contract/llm-schemas.test.ts

## G. 코어 모델 및 서비스

- [x] T029 [P] Create User model in core/models/user.ts
- [x] T030 [P] Create Room model in core/models/room.ts
- [x] T031 [P] Create Motion model in core/models/motion.ts
- [x] T032 [P] Create Argument model in core/models/argument.ts
- [x] T033 [P] Create DebateSession model in core/models/debate-session.ts
- [x] T034 [P] Create Verdict model in core/models/verdict.ts
- [x] T035 [P] Create Job model in core/models/job.ts
- [x] T036 [P] Create UserService in core/services/user-service.ts
- [x] T036b [P] Create RoomService in core/services/room-service.ts
- [x] T037 [P] Create DebateService in core/services/debate-service.ts
- [x] T038 [P] Create AIService in core/services/ai-service.ts
- [x] T039 [P] Create JobService in core/services/job-service.ts

## H. API 라우트 구현 (REST/Edge 연동)

- [x] T040 Create rooms API routes in app/api/rooms/route.ts (create, list)
- [x] T041 Create room join API in app/api/rooms/join/route.ts
- [x] T042 Create room detail API in app/api/rooms/[id]/route.ts
- [x] T043 Create room status API in app/api/rooms/[id]/status/route.ts
- [x] T044 Create motion API in app/api/rooms/[id]/motion/route.ts
- [x] T045 Create claims API in app/api/rooms/[id]/claims/route.ts
- [x] T046 Create arguments API in app/api/rooms/[id]/arguments/route.ts
- [x] T047 Create debate start API in app/api/rooms/[id]/debate/start/route.ts
- [x] T048 Create judge API in app/api/rooms/[id]/judge/route.ts
- [x] T049 Create jury API in app/api/rooms/[id]/jury/route.ts
- [x] T050 Create jobs status API in app/api/jobs/[id]/route.ts
- [x] T051 Create jobs next API in app/api/jobs/next/route.ts

## I. UI 페이지 및 컴포넌트

- [x] T052 [P] Create main layout in app/layout.tsx
- [x] T053 [P] Create homepage in app/page.tsx
- [x] T054 [P] Create rooms list page in app/rooms/page.tsx
- [x] T055 [P] Create room creation page in app/rooms/create/page.tsx
- [x] T056 [P] Create room detail page in app/rooms/[id]/page.tsx
- [ ] T056 [P] Create history page in app/(dashboard)/history/page.tsx
- [x] T057 [P] Create room creation component in components/room/room-create.tsx
- [x] T058 [P] Create room join component in components/room/room-join.tsx
- [x] T059 [P] Create room status component in components/room/room-status.tsx
- [ ] T060 [P] Create argument form component in components/debate/argument-form.tsx
- [x] T061 [P] Create debate viewer component in components/debate/debate-viewer.tsx
- [x] T062 [P] Create verdict display component in components/debate/verdict-display.tsx

## J. MCP 개발·디버깅 도구 설정

- [ ] T063 [P] Configure supabase MCP in .cursor/mcp.json
  - Schema/table inspection, migration checking
  - RLS policy simulation and read-only safety checks
  - Job queue monitoring, Edge Function log extraction
  - Test data seeding/rollback with snapshot strategy
- [ ] T064 [P] Configure playwright MCP for E2E flows
  - Request → disconnect → reconnect scenarios
  - Failure screenshot and trace collection
- [ ] T065 [P] Configure sequential-thinking MCP
  - Lawyer exchange 5 rounds → judge → (2nd/final) → jury batch
  - Procedural execution script definition
- [ ] T066 [P] Configure serena MCP for code quality
  - Server code and prompt template quality diagnosis
  - Dead code, module boundary violations, missing prompt keys

## K. 통합 테스트

- [ ] T067 [P] Integration test for room creation flow in tests/integration/room-creation.test.ts
- [ ] T068 [P] Integration test for debate flow in tests/integration/debate-flow.test.ts
- [ ] T069 [P] Integration test for auth flow in tests/integration/auth-flow.test.ts
- [ ] T070 [P] Integration test for job processing in tests/integration/job-processing.test.ts

## L. E2E 테스트 및 운영

- [ ] T071 Create structured logging utilities in core/utils/logger.ts
- [ ] T072 Create error pages in app/error.tsx and app/not-found.tsx
- [ ] T073 Create admin log viewer in app/admin/logs/page.tsx
- [ ] T074 [P] E2E test for complete debate flow in tests/e2e/complete-debate.spec.ts
- [ ] T075 [P] E2E test for disconnect/reconnect scenario in tests/e2e/disconnect-reconnect.spec.ts
- [ ] T076 Setup Supabase scheduler for jobs-worker periodic execution
- [ ] T077 [P] Performance optimization (bundle analysis, SSR optimization)
- [ ] T078 [P] Accessibility compliance (ARIA, keyboard navigation)

## M. 배포 및 최종 설정

- [ ] T079 Configure Vercel deployment with environment variables
- [ ] T080 Deploy Supabase database and Edge Functions
- [ ] T081 [P] Create deployment checklist in docs/deployment.md
- [ ] T082 [P] Create privacy and security checklist in docs/security.md
- [ ] T083 Final integration testing and performance validation

## Dependencies

**Critical Path**:
- T001-T005 (Setup) → T011-T015 (Database) → T019-T024 (Auth) → T025-T028 (Contract Tests) → T029-T039 (Models/Services) → T040-T051 (APIs) → T052-T062 (UI) → T067-T078 (Testing) → T079-T083 (Deployment)

**Parallel Groups**:
- **Setup Phase**: T002, T003, T004, T005 can run in parallel
- **UI Components**: T006-T010 can run in parallel
- **Database**: T014, T015 can run in parallel after T013
- **Edge Functions**: T016-T018 can run in parallel
- **Contract Tests**: T025-T028 can run in parallel (MUST complete before API implementation)
- **Models**: T029-T035 can run in parallel
- **Services**: T036-T039 can run in parallel after models
- **UI Pages**: T052-T056 can run in parallel
- **UI Components**: T057-T062 can run in parallel
- **MCP Setup**: T063-T066 can run in parallel
- **Integration Tests**: T067-T070 can run in parallel
- **Final Tasks**: T074-T078, T081-T082 can run in parallel

## Parallel Execution Examples

```bash
# Phase 1: Setup (parallel)
Task: "Configure Tailwind CSS with monochrome theme and single accent color"
Task: "Setup project structure (/core, /data, /app, /components, /supabase)"
Task: "Configure linting and formatting tools (ESLint, Prettier, zero errors target)"
Task: "Setup environment variables (.env.local template)"

# Phase 2: Contract Tests (parallel, BEFORE implementation)
Task: "Contract test for rooms API in tests/contract/rooms-api.test.ts"
Task: "Contract test for debates API in tests/contract/debates-api.test.ts"
Task: "Contract test for jobs API in tests/contract/jobs-api.test.ts"
Task: "LLM response schema validation tests in tests/contract/llm-schemas.test.ts"

# Phase 3: Models (parallel)
Task: "Create User model in core/models/user.ts"
Task: "Create Room model in core/models/room.ts"
Task: "Create Motion model in core/models/motion.ts"
Task: "Create Argument model in core/models/argument.ts"
```

## Notes
- [P] tasks = different files, no dependencies
- Contract tests (T025-T028) MUST complete before API implementation (T040-T051)
- Database schema (T012-T013) must complete before all data operations
- Auth setup (T019-T024) must complete before protected routes
- Models (T029-T035) must complete before services (T036-T039)
- Services must complete before API routes (T040-T051)
- MCP tools (T063-T066) enhance development but don't block critical path
- Commit after each completed task
- Verify tests pass before moving to next phase

## Task Generation Rules Applied
- Each contract file → contract test task [P] (T025-T028)
- Each entity in data-model → model creation task [P] (T029-T035)
- Each API endpoint → implementation task (T040-T051)
- Each user story → integration test [P] (T067-T070)
- Different files = parallel [P], same file = sequential
- TDD order: Tests before implementation enforced

---

**Total Tasks**: 83
**Estimated Duration**: 8-12 weeks (with parallel execution)
**Critical Dependencies**: Setup → Database → Auth → Tests → Implementation → UI → Deployment
