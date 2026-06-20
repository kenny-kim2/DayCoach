# DayCoach — Product Requirements Document

> **"머릿속 혼돈을 오늘의 실행 계획으로"**
> 할 일, 걱정거리, 메모, 아이디어를 아무 순서 없이 입력하면 AI가 실행 가능한 하루 계획으로 정리해 주는 개인 AI 비서

---

## 목차

1. [서비스 개요](#1-서비스-개요)
2. [팀 구성 및 역할](#2-팀-구성-및-역할)
3. [핵심 문제 정의](#3-핵심-문제-정의)
4. [MVP 기능 범위](#4-mvp-기능-범위)
5. [기술 스택](#5-기술-스택)
6. [Copilot SDK 활용 설계](#6-copilot-sdk-활용-설계)
7. [API 명세](#7-api-명세)
8. [프론트엔드 화면 설계](#8-프론트엔드-화면-설계)
9. [Azure 배포 구성](#9-azure-배포-구성)
10. [심사 항목 대응](#10-심사-항목-대응)
11. [비기능 요구사항](#11-비기능-요구사항)
12. [개발 로드맵](#12-개발-로드맵)

---

## 1. 서비스 개요

| 항목 | 내용 |
|---|---|
| **서비스명** | DayCoach |
| **서브타이틀** | 오늘의 AI 비서 |
| **타겟 사용자** | 해야 할 일이 많아 무엇부터 시작해야 할지 모르는 직장인·학생 |
| **핵심 가치** | "Brain dump → Actionable Day Plan" — 흩어진 생각을 5초 만에 실행 계획으로 변환 |
| **플랫폼** | 반응형 웹 앱 (데스크톱 / 모바일) |
| **배포** | Azure App Service |

---

## 2. 팀 구성 및 역할

| 역할 | 담당 영역 |
|---|---|
| **백엔드** | Next.js API Route, Copilot SDK 에이전트, Azure OpenAI 연동, Azure 배포 |
| **프론트엔드** | Next.js UI, 입력 화면, 결과 카드 화면, 반응형 디자인 |

---

## 3. 핵심 문제 정의

### 문제 상황
사람들은 아침에 일어나면 머릿속에 수십 가지 생각이 뒤엉켜 있다.
- "오늘 보고서 마감인데..."
- "친구한테 연락해야 하는데..."
- "운동도 해야 하고..."
- "그 거래처 답장도 써야 하고..."

이 상태에서 단순한 TODO 앱을 써도, 정렬되지 않은 리스트만 쌓일 뿐 **무엇부터 해야 하는지, 지금 당장 뭘 해야 하는지**를 알기 어렵다.

### DayCoach의 해법
사용자는 그냥 **생각나는 대로 모두 입력**한다.  
DayCoach는 Copilot SDK 에이전트가 입력을 분석하여:
- 작업을 **분류·구조화**하고
- **우선순위와 예상 소요 시간**을 추정하며
- **오늘 할 일 vs 미뤄도 되는 일**을 구분하고
- **추천 실행 순서와 시간 블록**을 만들고
- **지금 당장 할 첫 행동** 하나를 명확히 제시한다.

---

## 4. MVP 기능 범위

### ✅ 포함 (In Scope)

| # | 기능 | 설명 |
|---|---|---|
| 1 | **자유 입력** | 텍스트 영역에 할 일, 걱정, 메모를 자유롭게 입력 |
| 2 | **AI 분석** | Copilot SDK 에이전트가 입력을 파싱·분류·우선순위화 |
| 3 | **결과 카드 UI** | 분석 결과를 우선순위별 카드 형태로 표시 |
| 4 | **시간 블록** | 예상 소요 시간 기반 오늘의 일정 블록 제시 |
| 5 | **첫 행동 강조** | "지금 당장 할 첫 행동" 배너를 최상단에 강조 표시 |
| 6 | **분석 투명성** | AI가 왜 이 우선순위를 제안했는지 한 줄 이유 표시 |
| 7 | **스트리밍 응답** | Copilot SDK 스트리밍으로 분석 결과를 실시간 표시 |
| 8 | **다시 분석** | 입력 수정 후 재분석 가능 |

### ❌ 제외 (Out of Scope)

- 로그인 / 회원가입 / 소셜 인증
- 결제 시스템
- 복잡한 데이터베이스 (영구 저장 없음, 세션 기반)
- 실시간 팀 협업
- 모바일 네이티브 앱

---

## 5. 기술 스택

```
모노레포 (daycoach/)
├── frontend/   → 프론트엔드 전담
│   └─ Next.js 14 (App Router) + React + TypeScript
│   └─ Tailwind CSS (반응형 UI)
│   └─ Framer Motion (카드 애니메이션)
│   └─ 배포: Azure Static Web Apps
│
├── backend/    → 백엔드 전담
│   └─ Node.js + Express + TypeScript
│   └─ @github/copilot-sdk (TypeScript SDK)
│   └─ GitHub Copilot (GITHUB_TOKEN 또는 gh auth 인증)
│   └─ 배포: Azure App Service (Node.js 20)
│
└── shared/     → 공유 TypeScript 타입 (둘 다 import)
```

---

## 6. Copilot SDK 활용 설계

> **심사 1순위 항목 (25%)**: Copilot SDK가 앱의 핵심 가치 전달에 중심 역할을 해야 합니다.

### 에이전트 아키텍처

```
사용자 입력 (자유 텍스트)
        ↓
  Next.js API Route
        ↓
  @github/copilot-sdk (TypeScript)
        ↓  JSON-RPC
  Copilot CLI (server mode)
        ↓
  Azure OpenAI gpt-4o (BYOK)
        ↓
  스트리밍 분석 결과
        ↓
  프론트엔드 카드 UI
```

### 커스텀 도구 (Custom Tools) 정의

Copilot SDK의 커스텀 도구 기능으로 아래 3개의 도구를 에이전트에 등록합니다:

#### Tool 1: `parse_tasks`
```typescript
// 자유 텍스트에서 개별 작업을 추출
{
  name: "parse_tasks",
  description: "Extract individual tasks from free-form text input",
  parameters: {
    raw_input: string  // 사용자 입력 원문
  },
  returns: Task[]  // 구조화된 작업 목록
}
```

#### Tool 2: `prioritize_tasks`
```typescript
// 작업에 우선순위, 소요 시간, 카테고리 부여
{
  name: "prioritize_tasks",
  description: "Assign priority, estimated duration, category, and urgency to each task",
  parameters: {
    tasks: Task[]
  },
  returns: PrioritizedTask[]
}
```

#### Tool 3: `build_day_plan`
```typescript
// 오늘의 실행 계획 및 첫 행동 생성
{
  name: "build_day_plan",
  description: "Build an actionable day plan with time blocks and identify the first action to take right now",
  parameters: {
    prioritized_tasks: PrioritizedTask[],
    available_hours: number  // 오늘 사용 가능한 시간 (기본: 8)
  },
  returns: DayPlan
}
```

### 스트리밍 처리

```typescript
import { CopilotClient } from "@github/copilot-sdk";

const client = new CopilotClient({
  // GitHub Copilot 인증 (GITHUB_TOKEN 환경변수 또는 로컬 gh auth)
  ...(process.env.GITHUB_TOKEN ? { githubToken: process.env.GITHUB_TOKEN } : {}),
});

// createSession + defineTool로 3단계 도구 체인 실행
const session = await client.createSession({
  systemMessage: { mode: "replace", content: buildSystemPrompt(userInput) },
  tools: [parse_tasks, prioritize_tasks, build_day_plan],
  onPermissionRequest: approveAll,
});
await session.sendAndWait({ prompt: userPrompt }, 300000);
```

### 시스템 프롬프트 설계

```
You are DayCoach, a personal productivity AI assistant.

Your job is to:
1. Call parse_tasks to extract individual tasks from the user's free-form input
2. Call prioritize_tasks to assign priority (high/medium/low), estimated duration (minutes), 
   category (work/personal/health/admin), urgency (today/this-week/someday), 
   and a one-sentence reason for the priority
3. Call build_day_plan to create time blocks and identify the single most important 
   first action the user should take RIGHT NOW

Always provide reasoning for your prioritization.
Be concise, practical, and encouraging.
If input is in Korean, respond in Korean.
```

---

## 7. API 명세

### POST `/api/analyze`

프론트엔드와 백엔드가 이 인터페이스를 기준으로 **병렬 개발**합니다.

#### Request

```typescript
interface AnalyzeRequest {
  input: string;           // 사용자 자유 입력 텍스트
  availableHours?: number; // 오늘 가용 시간 (기본값: 8)
}
```

#### Response (Streaming: `text/event-stream`)

각 SSE 이벤트는 아래 형식으로 전송됩니다:

```typescript
// 이벤트 타입 1: 파싱된 작업 목록
data: { type: "tasks_parsed", tasks: Task[] }

// 이벤트 타입 2: 우선순위 결과
data: { type: "tasks_prioritized", tasks: PrioritizedTask[] }

// 이벤트 타입 3: 최종 하루 계획
data: { type: "day_plan", plan: DayPlan }

// 이벤트 타입 4: 완료
data: { type: "done" }

// 이벤트 타입 5: 오류
data: { type: "error", message: string }
```

#### 핵심 타입 정의

```typescript
interface Task {
  id: string;
  title: string;
  rawText: string;
}

interface PrioritizedTask extends Task {
  priority: "high" | "medium" | "low";
  estimatedMinutes: number;
  category: "work" | "personal" | "health" | "admin" | "other";
  urgency: "today" | "this-week" | "someday";
  reason: string;           // AI가 이 우선순위를 준 이유 (투명성)
}

interface TimeBlock {
  startOffset: number;      // 시작 오프셋 (분)
  durationMinutes: number;
  taskId: string;
  taskTitle: string;
}

interface DayPlan {
  firstAction: {
    taskId: string;
    taskTitle: string;
    why: string;            // 왜 이게 첫 행동인지 설명
    howToStart: string;     // 구체적인 시작 방법
  };
  todayTasks: PrioritizedTask[];
  deferredTasks: PrioritizedTask[];
  timeBlocks: TimeBlock[];
  totalEstimatedMinutes: number;
  motivationalMessage: string;
}
```

#### 에러 응답

```typescript
// HTTP 400
{ "error": "input_required", "message": "입력 내용을 입력해주세요." }

// HTTP 429
{ "error": "rate_limited", "message": "잠시 후 다시 시도해주세요." }

// HTTP 500
{ "error": "analysis_failed", "message": "분석 중 오류가 발생했습니다. 다시 시도해주세요." }
```

---

## 8. 프론트엔드 화면 설계

### 화면 흐름

```
[입력 화면]  →  [분석 중 (스트리밍)]  →  [결과 화면]
    ↑                                          |
    └──────────── "다시 분석" ─────────────────┘
```

### 화면 1: 입력 (Input Screen)

```
┌─────────────────────────────────────────┐
│  🧠 DayCoach                            │
│  오늘 해야 할 일을 모두 쏟아내세요        │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 오늘 보고서 마감인데 아직 반도   │    │
│  │ 못 썼고, 친구한테 연락도 해야   │    │
│  │ 하고, 운동도 하고 싶고...        │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  오늘 사용 가능한 시간: [8] 시간         │
│                                         │
│  [  🚀 오늘 계획 만들기  ]              │
└─────────────────────────────────────────┘
```

### 화면 2: 분석 중 (Loading / Streaming)

- 파싱된 작업 항목이 실시간으로 한 줄씩 나타남
- 프로그레스 메시지: "작업 파악 중..." → "우선순위 정하는 중..." → "하루 계획 완성 중..."

### 화면 3: 결과 (Result Screen)

```
┌─────────────────────────────────────────┐
│  ⚡ 지금 당장 할 첫 행동                 │  ← 강조 배너
│  📄 보고서 서론 2문단 쓰기              │
│  "마감이 가장 급합니다. 지금 바로 첫   │
│   문단부터 시작하세요."                  │
└─────────────────────────────────────────┘

오늘 할 일 (4개 · 예상 3시간 40분)
┌──────┬──────────────────────────┬──────┐
│ 🔴 상 │ 보고서 작성              │ 2h   │
│      │ "마감 오늘, 즉시 시작"    │      │
├──────┼──────────────────────────┼──────┤
│ 🟡 중 │ 거래처 이메일 답장       │ 20m  │
│      │ "업무 연속성에 중요"       │      │
├──────┼──────────────────────────┼──────┤
│ 🟢 하 │ 친구 연락               │ 10m  │
│      │ "빠르게 처리 가능"         │      │
└──────┴──────────────────────────┴──────┘

나중에 해도 되는 일 (2개)
┌──────────────────────────────────────┐
│ 운동 / 책 읽기                        │
└──────────────────────────────────────┘

오늘의 시간 블록
09:00 ████████████ 보고서 작성 (2h)
11:00 ██ 거래처 이메일 (20m)
11:20 █ 친구 연락 (10m)

[  🔄 다시 분석  ]
```

---

## 9. Azure 배포 구성

### 아키텍처

```
GitHub Repository (모노레포)
   ├── frontend/ ──→ GitHub Actions ──→ Azure Static Web Apps
   └── backend/  ──→ GitHub Actions ──→ Azure App Service
                                              ↑
                                    NEXT_PUBLIC_API_URL 환경변수로 연결
```

### 배포 대상

| 앱 | 서비스 | 이유 |
|---|---|---|
| `frontend/` | Azure Static Web Apps | Next.js SSR/SSG 지원, 무료 SSL, CDN |
| `backend/` | Azure App Service (Node.js 20) | Express 서버 상시 실행, Copilot SDK |

### 환경 변수

**backend/** (Azure App Service 환경변수)

| 변수명 | 설명 |
|---|---|
| `GITHUB_TOKEN` | GitHub Copilot 인증 토큰 (없으면 로컬 `gh auth` 사용) |
| `COPILOT_MODEL` | 사용할 모델명 (선택, 기본값: Copilot 기본 모델) |
| `CORS_ORIGIN` | 프론트엔드 URL (예: `https://daycoach.azurestaticapps.net`) |
| `PORT` | 서버 포트 (기본: `3001`) |

**frontend/** (Azure Static Web Apps 환경변수)

| 변수명 | 설명 |
|---|---|
| `NEXT_PUBLIC_API_URL` | 백엔드 URL (예: `https://daycoach-api.azurewebsites.net`) |

### GitHub Actions 워크플로우

**`.github/workflows/deploy-backend.yml`**
```yaml
on:
  push:
    branches: [main]
    paths: ['backend/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd backend && npm ci && npm run build
      - uses: azure/webapps-deploy@v3
        with:
          app-name: daycoach-api
          publish-profile: ${{ secrets.AZURE_BACKEND_PUBLISH_PROFILE }}
          package: backend
```

**`.github/workflows/deploy-frontend.yml`**
```yaml
on:
  push:
    branches: [main]
    paths: ['frontend/**', 'shared/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd frontend && npm ci && npm run build
      - uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: upload
          app_location: frontend
          output_location: .next
```

---

## 10. 심사 항목 대응

### 1. Effective Use of Copilot SDK (25%)

| 요소 | DayCoach 대응 |
|---|---|
| **SDK가 핵심 가치에 필수적** | 분석 전 과정(파싱→우선순위→계획)이 Copilot SDK 에이전트로 구동 |
| **커스텀 도구 호출** | `parse_tasks`, `prioritize_tasks`, `build_day_plan` 3개 커스텀 도구 정의 |
| **스트리밍** | SSE(Server-Sent Events)로 분석 단계별 실시간 스트리밍 |
| **컨텍스트 처리** | 시스템 프롬프트에 사용자 가용 시간, 언어 컨텍스트 포함 |
| **에이전트 설계 깊이** | 단순 요약이 아닌 다단계 도구 체인으로 구조화된 결과 생성 |

### 2. Productivity Impact & Problem Fit (18%)

- **명확한 타겟**: "할 일이 많아 무엇부터 해야 할지 모르는 사람" — 직장인, 학생, 프리랜서
- **실질적 이점**: "Brain dump → Actionable Plan" 전환 시간 단축
- **첫 행동 강조**: 결정 마비(decision paralysis) 해소를 위한 단일 행동 제시

### 3. Azure AI & Cloud Integration (18%)

- **GitHub Copilot SDK** (`@github/copilot-sdk`) 를 핵심 AI 엔진으로 사용 — Azure App Service 위에서 운용
- Azure App Service 배포 (단순 끼워넣기 아닌 핵심 AI 처리 레이어)
- GitHub Actions → Azure 자동 배포 파이프라인 (backend: App Service, frontend: Static Web Apps)

### 4. Functionality & Technical Execution (16%)

- 엔드투엔드 동작: 입력 → SDK 분석 → 스트리밍 결과 → 카드 UI
- TypeScript 전체 타입 안전성
- 에러 처리: API 오류, 타임아웃, 빈 입력 등 모든 케이스 처리
- 반응형 웹 (모바일 / 데스크톱)

### 5. User Experience & Workflow Design (12%)

- 마찰 없는 진입: 로그인 없이 즉시 사용
- 자연스러운 AI 통합: 스트리밍으로 "AI가 생각하는 느낌" 시각화
- 투명성: 각 작업에 우선순위 이유 한 줄 표시
- 오류 우아한 처리: 분석 실패 시 재시도 버튼 즉시 표시

### 6. Responsible AI, Security & Trust (6%)

- **투명성**: 모든 우선순위에 `reason` 필드로 AI 판단 근거 표시
- **비밀 관리**: API 키를 Azure 환경변수로 관리, 클라이언트 노출 없음
- **환각 완화**: 구조화된 도구 호출로 자유 형식 환각 최소화
- **사용자 주도권**: "다시 분석" 기능으로 AI 결과를 사용자가 언제든 재시작 가능
- **Rate Limiting**: API Route에 요청 제한 적용

### 7. Innovation & Originality (5%)

- 기존 TODO 앱과 차별화: "입력→정리"가 아닌 "뇌 비우기→실행 계획"
- "지금 당장 할 첫 행동" 단일 CTA — 결정 마비 해소에 특화
- 작업 파싱부터 계획 생성까지 전 과정을 Copilot SDK 에이전트 체인으로 처리

---

## 11. 비기능 요구사항

| 항목 | 목표 |
|---|---|
| **응답 시간** | 첫 스트리밍 청크 2초 이내 도착 |
| **전체 분석** | 10초 이내 완료 (10개 이하 작업 기준) |
| **가용성** | Azure App Service 기본 SLA |
| **모바일 지원** | 320px 이상 반응형 |
| **접근성** | WCAG 2.1 AA 기본 준수 (키보드 탐색, 명암비) |

---

## 12. 개발 로드맵

### Phase 1: 기반 설정 (병렬 작업)

| 백엔드 (`backend/`) | 프론트엔드 (`frontend/`) |
|---|---|
| `npm init` + Express + TypeScript 설정 | Next.js 프로젝트 초기화 |
| `@github/copilot-sdk` 설치 및 설정 | Tailwind CSS + Framer Motion 설정 |
| `POST /api/analyze` 뼈대 + Mock 응답 | `shared/types.ts` import 설정 |
| `.env.example` 작성 | Mock 데이터로 결과 카드 UI 구현 |

### Phase 2: 핵심 기능 구현

| 백엔드 (`backend/`) | 프론트엔드 (`frontend/`) |
|---|---|
| Copilot SDK 커스텀 도구 3개 구현 | `useAnalysis` SSE 스트리밍 훅 |
| Azure OpenAI BYOK 연결 | `InputForm` 컴포넌트 |
| SSE 스트리밍 응답 파이프라인 | `PriorityCard` 컴포넌트 |
| CORS 설정 (`CORS_ORIGIN` 환경변수) | `TimeBlockChart` 컴포넌트 |
| 에러 처리 및 재시도 로직 | `FirstActionBanner` 컴포넌트 |

### Phase 3: 완성 및 배포

| 작업 | 담당 |
|---|---|
| Azure App Service 설정 (`backend/`) | 백엔드 |
| Azure Static Web Apps 설정 (`frontend/`) | 프론트엔드 |
| GitHub Actions 워크플로우 2개 작성 | 백엔드 |
| `NEXT_PUBLIC_API_URL` 환경변수 연결 | 프론트엔드 |
| 반응형 디자인 최종 조정 | 프론트엔드 |
| 엔드투엔드 통합 테스트 | 공동 |

---

## 부록: 디렉토리 구조

```
daycoach/                          ← 모노레포 루트
│
├── shared/                        ← 공유 TypeScript 타입 (둘 다 import)
│   └── types.ts                   # Task, PrioritizedTask, DayPlan 등
│
├── frontend/                      ← 프론트엔드 전담 (Next.js)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx           # 메인 페이지
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── InputForm.tsx      # 자유 입력 폼
│   │   │   ├── AnalyzingScreen.tsx
│   │   │   ├── ResultScreen.tsx
│   │   │   ├── FirstActionBanner.tsx
│   │   │   ├── PriorityCard.tsx
│   │   │   └── TimeBlockChart.tsx
│   │   └── hooks/
│   │       └── useAnalysis.ts     # SSE 스트리밍 훅
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
├── backend/                       ← 백엔드 전담 (Express + Copilot SDK)
│   ├── src/
│   │   ├── routes/
│   │   │   └── analyze.ts         # POST /api/analyze
│   │   ├── lib/
│   │   │   ├── agent.ts           # Copilot SDK 에이전트 설정
│   │   │   └── tools/
│   │   │       ├── parse-tasks.ts # parse_tasks 도구
│   │   │       ├── prioritize.ts  # prioritize_tasks 도구
│   │   │       └── build-plan.ts  # build_day_plan 도구
│   │   └── index.ts               # Express 서버 진입점
│   ├── .env.example
│   └── package.json
│
├── .github/
│   └── workflows/
│       ├── deploy-frontend.yml    # → Azure Static Web Apps
│       └── deploy-backend.yml     # → Azure App Service
│
└── PRD.md

충돌 없는 이유:
  프론트엔드 → frontend/ 만 수정
  백엔드     → backend/ 만 수정
  공유 타입  → shared/types.ts (둘 다 읽기만)
```

---

*DayCoach PRD v1.0 — 2026-06-20*
