# 🧠 DayCoach

> **"머릿속 혼돈을 오늘의 실행 계획으로"**  
> 할 일, 걱정거리, 메모를 자유롭게 입력하면 AI가 우선순위·시간 블록·첫 행동으로 정리해 주는 개인 AI 비서

[![Deploy Backend](https://github.com/kenny-kim2/DayCoach/actions/workflows/deploy-backend.yml/badge.svg)](https://github.com/kenny-kim2/DayCoach/actions/workflows/deploy-backend.yml)
[![Deploy Frontend](https://github.com/kenny-kim2/DayCoach/actions/workflows/deploy-frontend.yml/badge.svg)](https://github.com/kenny-kim2/DayCoach/actions/workflows/deploy-frontend.yml)

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | Next.js 14 (App Router) + React + TypeScript + Tailwind CSS + Framer Motion |
| Backend | Node.js + Express + TypeScript + [@github/copilot-sdk](https://www.npmjs.com/package/@github/copilot-sdk) |
| AI 엔진 | GitHub Copilot SDK (`CopilotClient` → `createSession` → 3-tool chain) |
| 배포 | Azure Static Web Apps (frontend) + Azure App Service (backend) |

## 로컬 개발 환경 설정

### 사전 요구 사항

- Node.js 20+
- GitHub CLI (`gh`) — Copilot SDK 인증에 필요
  ```bash
  gh auth login  # GitHub 계정 로그인
  ```

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/kenny-kim2/DayCoach.git
cd DayCoach

# 루트 의존성 설치
npm install

# 백엔드 환경변수 설정
cp backend/.env.example backend/.env
# backend/.env 파일에서 필요한 값 설정 (아래 환경변수 섹션 참고)

# 백엔드 실행 (터미널 1)
cd backend && npm run dev

# 프론트엔드 실행 (터미널 2)
cd frontend && npm run dev
```

- 프론트엔드: http://localhost:3000
- 백엔드: http://localhost:3001
- 헬스 체크: http://localhost:3001/health

## 환경 변수

### backend/.env

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `GITHUB_TOKEN` | GitHub Copilot 인증 토큰 (없으면 로컬 `gh auth` 사용) | (로컬 gh auth) |
| `COPILOT_MODEL` | 사용할 모델명 (선택) | Copilot 기본 모델 |
| `CORS_ORIGIN` | 허용할 프론트엔드 URL | `*` (개발용, 운영에서 반드시 설정) |
| `PORT` | 서버 포트 | `3001` |

### frontend/.env.local

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `NEXT_PUBLIC_API_URL` | 백엔드 URL | 미설정 시 개발용 mock API 사용 |

> ⚠️ **운영 환경**: `NEXT_PUBLIC_API_URL`을 반드시 설정해야 합니다. 미설정 시 503 오류가 반환됩니다.

## Azure 배포

### GitHub Secrets 설정

| Secret | 설명 |
|--------|------|
| `AZURE_CREDENTIALS` | Azure 서비스 주체 자격증명 (JSON) |
| `AZURE_STATIC_WEB_APPS_TOKEN` | Azure Static Web Apps 배포 토큰 |
| `NEXT_PUBLIC_API_URL` | 백엔드 App Service URL |
| `GITHUB_TOKEN` | GitHub Copilot 인증 토큰 (App Service 환경변수) |

### Azure App Service 환경변수

```
GITHUB_TOKEN=<GitHub PAT with Copilot 권한>
CORS_ORIGIN=https://<your-static-web-app>.azurestaticapps.net
PORT=3001
```

### 배포 트리거

```bash
git push origin main  # backend/ 또는 shared/ 변경 시 백엔드 자동 배포
                      # frontend/ 변경 시 프론트엔드 자동 배포
```

## 프로젝트 구조

```
DayCoach/
├── frontend/          # Next.js 프론트엔드
│   ├── app/
│   │   ├── components/   # UI 컴포넌트
│   │   ├── hooks/        # useAnalysis (SSE 스트리밍)
│   │   ├── lib/          # 타입 정의
│   │   └── api/analyze/  # 개발용 Mock API (운영 비활성)
├── backend/           # Express 백엔드
│   ├── src/
│   │   ├── routes/       # POST /api/analyze (SSE)
│   │   ├── agent/        # Copilot SDK 클라이언트 + 프롬프트
│   │   └── middleware/   # 에러 핸들러, Rate Limiter
├── shared/            # 공유 TypeScript 타입
└── .github/workflows/ # CI/CD (deploy-backend.yml, deploy-frontend.yml)
```

## API

### `POST /api/analyze`

스트리밍 SSE 응답으로 분석 결과를 단계별 전송합니다.

**Request:**
```json
{
  "input": "오늘 보고서 마감이고 운동도 하고 싶어",
  "availableHours": 8,
  "currentHour": 9,
  "currentMinute": 0
}
```

**SSE Events:**
```
data: { "type": "tasks_parsed", "tasks": [...] }
data: { "type": "tasks_prioritized", "tasks": [...] }
data: { "type": "day_plan", "plan": {...} }
data: { "type": "done" }
```

**Rate Limit:** 60초 윈도우에 IP당 최대 10회

## Copilot SDK 활용 구조

```
사용자 입력 (자유 텍스트)
       ↓
  preParseInput()  ← 한국어 접속어 기반 사전 분리
       ↓
  CopilotClient.createSession()
       ↓  3단계 도구 체인
  parse_tasks → prioritize_tasks → build_day_plan
       ↓  SSE 스트리밍
  프론트엔드 카드 UI
```
