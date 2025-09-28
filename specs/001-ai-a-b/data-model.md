# Data Model: 사적 재판 시스템

**Date**: 2025-09-27  
**Feature**: 001-ai-a-b

## Core Entities

### User
사용자 정보 및 인증 상태를 관리한다.

**Fields**:
- `id`: UUID (Primary Key)
- `email`: String (Unique, Not Null)
- `display_name`: String
- `avatar_url`: String (Optional)
- `created_at`: Timestamp
- `updated_at`: Timestamp

**Relationships**:
- One-to-Many: Room (as creator)
- Many-to-Many: Room (as participant)

**Validation Rules**:
- Email format validation
- Display name 2-50 characters
- Avatar URL format validation

### Room
토론이 진행되는 공간과 상태를 관리한다.

**Fields**:
- `id`: UUID (Primary Key)
- `code`: String (Unique, 6-digit alphanumeric)
- `creator_id`: UUID (Foreign Key → User)
- `participant_id`: UUID (Foreign Key → User, Optional)
- `title`: String
- `description`: Text (Optional)
- `status`: Enum (waiting_participant, agenda_negotiation, arguments_submission, ai_processing, completed, cancelled)
- `created_at`: Timestamp
- `updated_at`: Timestamp

**Relationships**:
- Many-to-One: User (creator)
- Many-to-One: User (participant)
- One-to-One: Agenda
- One-to-Many: Argument
- One-to-Many: DebateSession
- One-to-One: Verdict

**Validation Rules**:
- Code uniqueness and format (6 alphanumeric)
- Title 5-200 characters
- Status transitions validation

**State Transitions**:
```
waiting_participant → agenda_negotiation (participant joins)
agenda_negotiation → arguments_submission (agenda agreed)
arguments_submission → ai_processing (both arguments submitted)
ai_processing → completed (verdict generated)
any → cancelled (user action)
```

### Agenda
토론 주제와 합의 과정을 관리한다.

**Fields**:
- `id`: UUID (Primary Key)
- `room_id`: UUID (Foreign Key → Room)
- `title`: String
- `description`: Text
- `proposer_id`: UUID (Foreign Key → User)
- `status`: Enum (proposed, under_negotiation, agreed, rejected)
- `negotiation_history`: JSONB (Array of modifications)
- `agreed_at`: Timestamp (Optional)
- `created_at`: Timestamp
- `updated_at`: Timestamp

**Relationships**:
- One-to-One: Room
- Many-to-One: User (proposer)

**Validation Rules**:
- Title 10-300 characters
- Description 50-2000 characters
- Negotiation history structure validation

### Argument
사용자의 주장과 증거를 저장한다.

**Fields**:
- `id`: UUID (Primary Key)
- `room_id`: UUID (Foreign Key → Room)
- `user_id`: UUID (Foreign Key → User)
- `side`: Enum (A, B)
- `title`: String
- `content`: Text
- `evidence`: JSONB (Array of evidence items)
- `submitted_at`: Timestamp
- `created_at`: Timestamp
- `updated_at`: Timestamp

**Relationships**:
- Many-to-One: Room
- Many-to-One: User

**Validation Rules**:
- Title 10-200 characters
- Content 100-5000 characters
- Evidence structure validation
- One argument per user per room

### DebateSession
AI 변호사들의 토론 세션을 관리한다.

**Fields**:
- `id`: UUID (Primary Key)
- `room_id`: UUID (Foreign Key → Room)
- `round`: Integer (1, 2, 3 for 1차, 2차, 최종)
- `lawyer_a_response`: JSONB
- `lawyer_b_response`: JSONB
- `status`: Enum (pending, in_progress, completed, failed)
- `started_at`: Timestamp (Optional)
- `completed_at`: Timestamp (Optional)
- `created_at`: Timestamp
- `updated_at`: Timestamp

**Relationships**:
- Many-to-One: Room

**Validation Rules**:
- Round 1-3 range
- Response JSON schema validation
- Sequential round completion

### JuryVote
배심원들의 투표와 사유를 저장한다.

**Fields**:
- `id`: UUID (Primary Key)
- `room_id`: UUID (Foreign Key → Room)
- `jury_number`: Integer (1-7)
- `vote`: Enum (A, B)
- `reasoning`: Text
- `confidence`: Integer (1-10)
- `created_at`: Timestamp

**Relationships**:
- Many-to-One: Room

**Validation Rules**:
- Jury number 1-7 range
- Reasoning 100-1000 characters
- Confidence 1-10 range
- Unique jury per room

### Verdict
판사의 최종 판결을 저장한다.

**Fields**:
- `id`: UUID (Primary Key)
- `room_id`: UUID (Foreign Key → Room)
- `winner`: Enum (A, B, draw)
- `reasoning`: Text
- `strengths_a`: Text
- `weaknesses_a`: Text
- `strengths_b`: Text
- `weaknesses_b`: Text
- `overall_quality`: Integer (1-10)
- `generated_at`: Timestamp
- `created_at`: Timestamp

**Relationships**:
- One-to-One: Room

**Validation Rules**:
- Reasoning 500-3000 characters
- Strengths/weaknesses 100-1000 characters each
- Overall quality 1-10 range

### Job
비동기 작업 처리를 위한 큐 시스템이다.

**Fields**:
- `id`: UUID (Primary Key)
- `type`: Enum (ai_debate, ai_judge, ai_jury, notification)
- `status`: Enum (queued, running, succeeded, failed, retrying)
- `room_id`: UUID (Foreign Key → Room, Optional)
- `payload`: JSONB
- `result`: JSONB (Optional)
- `error_message`: Text (Optional)
- `retry_count`: Integer (Default: 0)
- `max_retries`: Integer (Default: 3)
- `scheduled_at`: Timestamp
- `started_at`: Timestamp (Optional)
- `completed_at`: Timestamp (Optional)
- `created_at`: Timestamp
- `updated_at`: Timestamp

**Relationships**:
- Many-to-One: Room (optional)

**Validation Rules**:
- Payload JSON structure validation
- Retry count ≤ max retries
- Status transition validation

## Database Schema (PostgreSQL)

### RLS (Row Level Security) Policies

**Users Table**:
- Users can read their own profile
- Users can update their own profile

**Rooms Table**:
- Users can read rooms they created or participate in
- Users can update rooms they created (limited fields)
- Users can insert new rooms

**Arguments Table**:
- Users can read arguments in rooms they participate in
- Users can insert/update their own arguments

**Other Tables**:
- Read-only access for room participants
- System-generated data (debates, votes, verdicts)

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_rooms_creator ON rooms(creator_id);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_arguments_room_user ON arguments(room_id, user_id);
CREATE INDEX idx_jobs_status_scheduled ON jobs(status, scheduled_at);
CREATE INDEX idx_debate_sessions_room_round ON debate_sessions(room_id, round);

-- Unique constraints
ALTER TABLE rooms ADD CONSTRAINT unique_room_code UNIQUE(code);
ALTER TABLE arguments ADD CONSTRAINT unique_user_argument_per_room UNIQUE(room_id, user_id);
ALTER TABLE jury_votes ADD CONSTRAINT unique_jury_per_room UNIQUE(room_id, jury_number);
```

### Triggers

```sql
-- Auto-generate room codes
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.code = generate_random_code(6);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Data Flow

### Room Creation Flow
1. User creates room → Room (waiting_participant)
2. System generates unique code
3. Room awaits participant

### Debate Flow
1. Participant joins → Room (agenda_negotiation)
2. Agenda negotiation → Agenda (proposed/agreed)
3. Arguments submission → Argument (both sides)
4. AI processing → Job (queued) → DebateSession (3 rounds)
5. Jury voting → JuryVote (7 votes)
6. Judge verdict → Verdict → Room (completed)

### Job Processing Flow
1. API creates Job (queued)
2. Edge Function picks up job → Job (running)
3. Processing completes → Job (succeeded/failed)
4. Results stored in related entities
5. Room status updated

---

**Status**: ✅ Data model complete  
**Next**: API Contracts generation
