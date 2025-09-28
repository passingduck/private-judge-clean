
# Implementation Plan: 사적 재판 시스템

**Branch**: `001-ai-a-b` | **Date**: 2025-09-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/sungjin/workspace/private_judge/specs/001-ai-a-b/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
사적 재판 시스템은 두 사용자 간의 구조화된 토론을 통해 공정한 AI 판결을 제공하는 비동기 웹 애플리케이션이다. 방 생성/입장 → 안건 합의 → 주장 제출 → AI 변호사 토론 → AI 판사/배심원 판결의 단계적 프로세스를 지원하며, 사용자 이탈 후 재접속 시 결과 열람이 가능하다. Next.js 15 + Supabase + Vercel 아키텍처로 구현하며, 모든 LLM 처리는 비동기 Edge Functions에서 수행한다.

## Technical Context
**Language/Version**: TypeScript 5.x, Next.js 15 (App Router)  
**Primary Dependencies**: Next.js 15, Supabase (Auth + Database), OpenAI API, Tailwind CSS  
**Storage**: Supabase PostgreSQL with RLS, jobs table for async processing  
**Testing**: Jest, React Testing Library, Playwright MCP for E2E  
**Target Platform**: Web (Vercel deployment), serverless Edge Functions
**Project Type**: web - Next.js full-stack application  
**Performance Goals**: Non-LLM routes p95 < 300ms, LLM processing via async jobs  
**Constraints**: Bundle gzip < 200KB, SSR prioritized, Korean language default  
**Scale/Scope**: Multi-user concurrent debates, persistent state, async LLM processing

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Code Quality Gates
- [x] Single responsibility principle maintained
- [x] Clear boundaries: /core (domain), /data (data access), /app/api/* (interface), /components (UI)
- [x] Server logic separates pure business logic from I/O (Supabase REST/Edge Functions, HTTP, LLM)
- [x] Public APIs have TSDoc comments
- [x] Zero lint/type errors
- [x] No circular dependencies
- [x] Error points have "cause·response·reproduction" comments and structured logs

### Testing Standards Gates
- [x] Test strategy covers: unit (core) → integration (API Route/server actions) → E2E (Playwright MCP)
- [x] Coverage targets: core 95%+, API/actions 90%+
- [x] LLM tests use JSON schema parser and snapshots
- [x] Real calls verified via async contract tests

### UX Consistency Gates
- [x] Korean language as default
- [x] Monochrome design with single accent color
- [x] Step-by-step progress Stepper and badges
- [x] State restoration for disconnection/reconnection (timeline/polling)

### Performance & Operations Gates
- [x] Quality prioritized (LLM delays acceptable via async jobs)
- [x] Non-LLM paths p95 < 300ms
- [x] Bundle gzip < 200KB, SSR prioritized
- [x] Audit logging (who/when/what), structured logs on all APIs
- [x] Error logging with stack+context

### Security Gates
- [x] Supabase Auth required
- [x] Room-level permission verification (owner/member check)
- [x] Secret keys server-only
- [x] Supabase client SDK prohibited - API Route → Supabase REST/Edge Functions only

### LLM Policy Gates
- [x] Default model gpt-5 (OPENAI_MODEL env var only)
- [x] Lawyer/jury dynamic templates, judge static templates
- [x] All responses JSON schema parsed and validated
- [x] Failure retry with exponential backoff (max 3 attempts)

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
app/
├── (auth)/
│   ├── login/
│   └── callback/
├── (dashboard)/
│   ├── rooms/
│   │   ├── create/
│   │   └── [roomId]/
│   └── history/
├── api/
│   ├── auth/
│   ├── rooms/
│   ├── debates/
│   ├── jobs/
│   └── webhooks/
├── globals.css
└── layout.tsx

core/
├── models/
│   ├── room.ts
│   ├── debate.ts
│   ├── user.ts
│   └── job.ts
├── services/
│   ├── room-service.ts
│   ├── debate-service.ts
│   ├── ai-service.ts
│   └── job-service.ts
└── types/
    ├── api.ts
    └── llm.ts

data/
├── supabase/
│   ├── client.ts
│   ├── auth.ts
│   └── queries.ts
└── schemas/
    ├── room.sql
    ├── debate.sql
    └── jobs.sql

components/
├── ui/
│   ├── stepper.tsx
│   ├── badge.tsx
│   └── timeline.tsx
├── room/
│   ├── room-create.tsx
│   ├── room-join.tsx
│   └── room-status.tsx
├── debate/
│   ├── argument-form.tsx
│   ├── debate-viewer.tsx
│   └── verdict-display.tsx
└── layout/
    ├── header.tsx
    └── sidebar.tsx

tests/
├── unit/
│   ├── core/
│   └── components/
├── integration/
│   ├── api/
│   └── pages/
└── e2e/
    └── playwright/

supabase/
├── functions/
│   ├── ai-lawyer/
│   ├── ai-judge/
│   ├── ai-jury/
│   └── job-processor/
├── migrations/
└── seed.sql
```

**Structure Decision**: Next.js 15 App Router 구조를 선택했다. `/core`에 도메인 로직, `/data`에 Supabase 연동, `/app/api`에 Route Handlers, `/components`에 UI 컴포넌트를 배치한다. Supabase Edge Functions는 `/supabase/functions`에서 관리하며, 모든 LLM 처리와 비동기 작업을 담당한다.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh cursor`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (data-model.md, contracts/, quickstart.md)
- Each API contract → contract test task [P] (rooms-api, debates-api, jobs-api)
- Each entity → model creation task [P] (User, Room, Agenda, Argument, DebateSession, JuryVote, Verdict, Job)
- Each user story → integration test scenario
- Supabase Edge Functions for AI processing
- Next.js App Router pages and components
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation
- Infrastructure first: Database schema, auth setup, job system
- Core models before services before API routes before UI
- Edge Functions before API integration
- Mark [P] for parallel execution (independent files/modules)

**Specific Task Categories**:
1. **Setup & Infrastructure** (5-7 tasks)
   - Next.js 15 project setup, Supabase configuration, environment variables
   - Database schema migration, RLS policies
   - Job queue system, Edge Functions deployment

2. **Contract Tests** (8-10 tasks) [P]
   - rooms-api.yaml → contract tests
   - debates-api.yaml → contract tests  
   - jobs-api.yaml → contract tests
   - LLM response schema validation tests

3. **Core Models & Services** (10-12 tasks)
   - Entity models (Room, Debate, User, Job) [P]
   - Service layer (RoomService, DebateService, AIService, JobService) [P]
   - Data access layer (Supabase queries, auth integration)

4. **API Implementation** (8-10 tasks)
   - Route handlers (/app/api/rooms, /app/api/debates, /app/api/jobs)
   - Authentication middleware
   - Request validation and error handling

5. **AI Integration** (6-8 tasks)
   - Edge Functions (ai-lawyer, ai-judge, ai-jury, job-processor)
   - LLM prompt templates (static judge, dynamic lawyer/jury)
   - JSON schema validation and retry logic

6. **UI Components & Pages** (12-15 tasks)
   - Layout components (Header, Sidebar, Stepper, Timeline) [P]
   - Room components (Create, Join, Status) [P]
   - Debate components (Argument form, Viewer, Verdict display) [P]
   - Pages (Dashboard, Room detail, History)

7. **Integration & Polish** (8-10 tasks)
   - E2E tests (Playwright MCP scenarios)
   - Performance optimization (bundle size, SSR)
   - Korean localization, accessibility
   - Error handling and logging

**Estimated Output**: 55-70 numbered, ordered tasks in tasks.md

**Dependency Management**:
- Database schema before all data operations
- Auth setup before protected routes
- Models before services before APIs before UI
- Edge Functions before API integration
- Contract tests before implementation

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none required)

---
*Based on Constitution v2.0.0 - See `/memory/constitution.md`*
