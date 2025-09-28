# Research: 사적 재판 시스템

**Date**: 2025-09-27  
**Feature**: 001-ai-a-b

## Research Findings

### Next.js 15 App Router Best Practices

**Decision**: Next.js 15 App Router with TypeScript  
**Rationale**: 
- Server Components 기본 지원으로 SSR 성능 최적화
- Route Handlers로 API 엔드포인트 구현 가능
- 파일 기반 라우팅으로 구조 명확성 확보
- Streaming과 Suspense로 비동기 UI 처리 최적화

**Alternatives considered**:
- Pages Router: 레거시, Server Components 제한적 지원
- Remix: 학습 곡선, 생태계 제한
- SvelteKit: TypeScript 지원 부족, 생태계 제한

### Supabase Integration Patterns

**Decision**: API Route → Supabase REST/Edge Functions 패턴  
**Rationale**:
- 클라이언트 SDK 금지 헌법 준수
- 서버 사이드 인증 토큰 관리 보안성
- RLS 정책과 서버 권한 검증 이중 보안
- Edge Functions로 장시간 LLM 처리 분리

**Alternatives considered**:
- 클라이언트 직접 연동: 헌법 위반, 보안 취약
- GraphQL: 복잡성 증가, 헌법의 단순성 원칙 위반
- tRPC: 추가 의존성, REST 표준 벗어남

### Async Job Processing Architecture

**Decision**: Supabase jobs 테이블 + Edge Functions 워커  
**Rationale**:
- 사용자 이탈/재접속 시나리오 지원
- LLM 장시간 처리를 비동기로 분리
- 상태 추적 및 재시도 로직 구현 가능
- Vercel 함수 타임아웃 제한 회피

**Alternatives considered**:
- Redis Queue: 추가 인프라, 비용 증가
- Vercel Cron: 스케줄링만 가능, 즉시 처리 불가
- Database Polling: 비효율적, 리소스 낭비

### LLM Orchestration Strategy

**Decision**: Sequential-thinking MCP + 정적/동적 템플릿 분리  
**Rationale**:
- 변호사 토론의 단계적 진행 제어
- 판사 일관성을 위한 정적 템플릿
- 배심원 다양성을 위한 동적 생성
- JSON 스키마 검증으로 응답 품질 보장

**Alternatives considered**:
- 단일 LLM 호출: 복잡성 처리 한계
- 외부 오케스트레이션: 의존성 증가
- 동기 처리: 사용자 대기 시간 증가

### State Management & UI Patterns

**Decision**: Server State + React Query + Optimistic Updates  
**Rationale**:
- 서버 상태와 클라이언트 상태 명확 분리
- 실시간 폴링으로 진행 상황 동기화
- 낙관적 업데이트로 UX 향상
- Stepper/Timeline 컴포넌트로 진행 상태 시각화

**Alternatives considered**:
- Zustand/Redux: 복잡성 증가, 서버 상태 중복
- WebSocket: 인프라 복잡성, Vercel 제한
- 페이지 새로고침: UX 저하

### Testing Strategy

**Decision**: 계층별 테스트 + Playwright MCP + Contract Tests  
**Rationale**:
- 헌법의 95%/90% 커버리지 목표 달성
- E2E 시나리오 자동화로 이탈/재접속 테스트
- LLM 계약 테스트로 스키마 검증
- MCP 도구 활용으로 개발 효율성 증대

**Alternatives considered**:
- 단위 테스트만: 통합 오류 미발견
- Cypress: Playwright MCP 헌법 요구사항
- Manual Testing: 비효율적, 회귀 위험

## Technical Decisions Summary

| Area | Decision | Key Benefit |
|------|----------|-------------|
| Framework | Next.js 15 App Router | SSR 성능 + 구조 명확성 |
| Database | Supabase PostgreSQL + RLS | 보안 + 확장성 |
| Auth | Supabase Auth via API Routes | 헌법 준수 + 보안 |
| Async Processing | Jobs Table + Edge Functions | 이탈/재접속 지원 |
| LLM | OpenAI gpt-5 + JSON Schema | 품질 + 일관성 |
| State Management | Server State + React Query | 실시간 동기화 |
| Testing | 계층별 + Playwright MCP | 헌법 커버리지 목표 |

## Implementation Priorities

1. **Core Infrastructure**: Auth, Database Schema, Job System
2. **Room Management**: 생성, 입장, 상태 관리
3. **Debate Flow**: 안건 합의, 주장 제출, 진행 상태
4. **AI Integration**: Edge Functions, LLM 처리, 스키마 검증
5. **UI/UX**: Stepper, Timeline, 상태 복원, 한국어 지원

## Risk Mitigation

- **LLM 응답 품질**: JSON 스키마 + 재시도 로직
- **사용자 이탈**: 비동기 처리 + 상태 저장
- **성능**: SSR + 번들 최적화 + 비동기 잡
- **보안**: RLS + 서버 사이드 검증 + 헌법 준수
- **확장성**: Edge Functions + 큐 시스템

---

**Status**: ✅ All NEEDS CLARIFICATION resolved  
**Next Phase**: Design & Contracts (Phase 1)
