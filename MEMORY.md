# TENTACLE — Codebase Memory

> Reference document for working on this codebase. Covers architecture, every subsystem, data models, API routes, AI pipeline, and notable patterns. Update this file whenever significant changes are made.

---

## What This App Does

**Tentacle** is an autonomous e-commerce customer service copilot for "Marigold & Co". It ingests customer support tickets (email/chat/whatsapp), runs them through a 4-stage AI pipeline (classify → retrieve → plan → act), and either auto-resolves the case or escalates it to a human agent — with a full audit trail of every decision.

The human agent sees a dashboard with live cases, can override any AI decision, and every override feeds back into a learning layer that adjusts future AI confidence scores.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | Full-stack, API routes + React in one repo |
| Language | TypeScript (strict) | `noImplicitAny`, no build errors allowed |
| AI | Google Gemini 2.0 Flash (`@google/genai`) | Fast, cheap, JSON-capable |
| Database | Prisma + SQLite (local) / PostgreSQL (Vercel) | Prisma abstracts the provider |
| Auth | NextAuth v4, credentials strategy, JWT sessions | 8h session, role-based access |
| State | Zustand | Global client store, no prop drilling |
| Data fetching | TanStack React Query | Server state, caching, refetch |
| UI components | Radix UI + shadcn/ui + Tailwind v4 | Accessible, composable |
| Animations | Framer Motion | Page transitions, panel animations |
| Charts | Recharts | Dashboard charts |
| Drag & drop | dnd-kit | Sortable workflow step lists |
| Bundler | Turbopack (Next.js 16 default) | Fast dev builds |
| Deployment | Vercel | Serverless, no `standalone` output |

---

## Project Structure

```
TENTACLE/
├── prisma/
│   ├── schema.prisma          # 9 data models
│   └── seed.ts                # Demo data (3 users, 8 customers, 10 orders, 11 cases, 10 policies)
├── src/
│   ├── app/
│   │   ├── api/               # 19 API route handlers (see API Routes section)
│   │   ├── login/page.tsx     # Login page (Suspense-wrapped for useSearchParams)
│   │   ├── page.tsx           # Root page (renders Shell + LoginGate)
│   │   ├── layout.tsx         # Root layout (fonts, metadata, Providers)
│   │   ├── providers.tsx      # SessionProvider + QueryClient + ThemeProvider
│   │   └── globals.css        # Tailwind base styles
│   ├── components/
│   │   ├── auth/              # LoginGate — redirects unauthenticated users
│   │   ├── cases/             # All case-related UI panels (17 components)
│   │   ├── common/            # ErrorBoundary
│   │   ├── dashboard/         # Dashboard charts and metrics (5 components)
│   │   ├── intake/            # IntakeView — manual case submission form
│   │   ├── layout/            # Shell, Sidebar, Topbar, MobileNav, CommandPalette
│   │   └── ui/                # shadcn/ui primitives (button, card, dialog, etc.)
│   ├── hooks/                 # Custom React hooks
│   ├── lib/
│   │   ├── ai/                # LLM pipeline (classify, retrieve, plan, respond, explain, learn, simulate)
│   │   ├── auth/              # NextAuth options + session helpers + requireRole
│   │   ├── data/              # mockData.ts — static data for dev/demo
│   │   ├── db/                # db.ts (Prisma singleton) + queries.ts (all DB functions)
│   │   ├── observability/     # logger.ts + metrics.ts
│   │   ├── resilience/        # circuitBreaker.ts + retry.ts
│   │   ├── security/          # pii.ts (redaction + sanitization) + rateLimit.ts
│   │   ├── utils/             # format.ts, cn helper
│   │   ├── validation/        # Zod schemas for API input validation
│   │   └── workflow/          # stateMachine.ts + rules.ts + actions.ts
│   ├── store/
│   │   └── appStore.ts        # Zustand global store
│   └── types/                 # TypeScript type definitions
├── .env                       # DATABASE_URL, GEMINI_API_KEY, NEXTAUTH_*
├── next.config.ts             # No standalone — Vercel compatible
├── vercel.json                # maxDuration: 30s for all API routes
└── prisma/schema.prisma
```

---

## Data Models (Prisma)

### User
Agents, managers, and admins. Password stored as SHA-256 hash (demo only — use bcrypt in production). Roles: `agent | manager | admin`.

### Customer
E-commerce customers. Fields: `tier` (standard/silver/gold/platinum), `lifetimeValue`, `orderCount`. Indexed on `email` and `tier`.

### Order
Customer orders. `items` and `status` stored as strings. Status: `placed | shipped | delivered | delayed | cancelled | returned`. `totalCents` is in cents (integer).

### Policy
Business policies that the rule engine evaluates. Key policy codes:
- `REFUND-30` — refund within 30 days of delivery
- `REFUND-LOWVAL` — auto-refund if order ≤ $25
- `RETURN-ELIG-90` — return eligible within 90 days
- `DAMAGE-FULL` — full replacement for damaged items
- `WRONG-PRODUCT` — replacement for wrong item sent
- `CANCEL-PRE-SHIP` — cancel if order status is `placed`
- `ADDR-PRE-SHIP` — address correction if `placed`
- `SHIP-DELAY-3D` — $10 credit if 3+ days late
- `ESCALATE-FURIOUS` — escalate if sentiment is `furious`
- `ESCALATE-HV-CASE` — escalate if order ≥ $500

### Case
The core entity. Tracks the full lifecycle of a support ticket. Key fields:
- `status` — `new | classified | retrieved | planned | acted | resolved | escalated`
- `intent`, `sentiment`, `sentimentScore`, `urgency`, `confidence` — set by classifier
- `resolutionPlan`, `workflowSteps` — JSON blobs set by planner/executor
- `responseDraft` — AI-drafted customer reply
- `retrievalHits` — JSON array of context retrieved
- `escalationReason` — set if escalated
- `automationSafe` — gates whether the pipeline auto-executes

### CaseLearningEntry
Every human override is stored here. This is the "organizational memory". Fields:
- `overrideType` — `rejected_action | edited_draft | escalated_false_positive | forced_action | plan_modified | resolved_differently`
- `originalDecision` + `humanDecision` — JSON snapshots of what AI proposed vs what human chose
- `context` — JSON with `{ intent, sentiment, urgency, orderTotalCents, policyCodes }`
- `learningImpact` — computed confidence delta on retrieval

### AuditLog
Immutable event log. Every action (system, agent, ai) is recorded. Categories: `intake | classification | retrieval | planning | action | escalation | state`.

### Metric
Simple key/value metric store for dashboard counters. Keys: `totalCases`, `autoResolved`, `escalated`, `open`, `avgResolutionMins`, `avgConfidence`, `automationRate`, `estimatedHoursSaved`.

### AppSetting
Singleton row (id=1). Configures: `autoRefundLimit`, `autoResolveUnder`, `highValueThreshold`, `requireApprovalAbove`, `escalateFurious`, `escalateHighValue`, `responseTone`, `alwaysDraftResponse`, `attachSimilarCases`.

---

## API Routes

All routes under `src/app/api/`. All require auth (NextAuth JWT) except health.

| Route | Method | What it does |
|---|---|---|
| `GET /api` | GET | API info/version |
| `POST /api/state` | POST | **Full autonomous pipeline** — runs classify → retrieve → plan → act in one shot. Takes `{ caseId }`. |
| `POST /api/classify` | POST | Classify a single case. Takes `{ caseId }`. Calls Gemini. |
| `POST /api/retrieve` | POST | Retrieve context for a case. Takes `{ caseId }`. Pure computation + DB. |
| `POST /api/plan` | POST | Plan resolution for a case. Takes `{ caseId }`. Calls Gemini. |
| `POST /api/act` | POST | Execute the plan for a case. Takes `{ caseId }`. Runs workflow steps. |
| `POST /api/ingest` | POST | Ingest a new support ticket. Takes `{ message, subject, channel, customerId?, orderId? }`. |
| `POST /api/explain` | POST | Explain AI reasoning for a case. Takes `{ caseId }`. Calls Gemini. |
| `POST /api/regenerate` | POST | Regenerate response draft. Takes `{ caseId }`. Calls Gemini. |
| `POST /api/simulate` | POST | Simulate business impact of an action. Takes `{ caseId, action }`. Pure logic. |
| `POST /api/resolve` | POST | Mark a case as resolved manually. Takes `{ caseId }`. |
| `POST /api/escalate` | POST | Manually escalate a case. Takes `{ caseId, reason }`. |
| `POST /api/override` | POST | Record a human override / learning entry. Takes override payload. |
| `POST /api/action` | POST | Execute a single named action on a case. Takes `{ caseId, action }`. |
| `GET /api/learning` | GET | Fetch learning history entries. |
| `GET /api/metrics` | GET | Prometheus text format metrics export. |
| `GET /api/health` | GET | Health check — DB connectivity + LLM circuit breaker state. No auth required. |
| `GET/POST/DELETE /api/settings` | GET/POST/DELETE | Read, update, or reset AppSettings. POST/DELETE require manager+ role. |
| `POST /api/reset` | POST | Reset all data to seed state. Requires admin role. |

---

## The AI Pipeline

Every case flows through 4 stages. The `/api/state` route runs all 4 in sequence. Individual routes run each stage independently for step-by-step use from the UI.

```
Ingest → Classify → Retrieve → Plan → Act → (Resolved | Escalated)
```

### Stage 1: Classify (`src/lib/ai/classify.ts`)
- Sends customer message + subject + order context to Gemini 2.0 Flash
- Returns: `intent`, `sentiment`, `sentimentScore`, `urgency`, `confidence`, `automationSafe`, `neededContext`, `keywords`, `explanation`
- Deterministic guardrails applied on top of LLM output: furious sentiment → `automationSafe=false`; order ≥ $500 → `automationSafe=false`
- Fallback: keyword-based heuristic classifier if LLM fails

**Intents:** `order_delay | damaged_item | wrong_product | refund_request | replacement_request | cancellation_request | address_correction | return_eligibility | general_inquiry | escalation`

### Stage 2: Retrieve (`src/lib/ai/retrieve.ts`)
- Pure computation — no LLM call
- Looks up: applicable policies (via `rules.ts`), customer order history, similar past cases
- Returns `RetrievalHit[]` with source (`policy | customer_history | order | similar_case`), title, snippet, relevance score
- Also runs `evaluateRules()` — policy pass/fail evaluation for the case facts

### Stage 3: Plan (`src/lib/ai/planner.ts`)
- Sends classification + retrieved context + applicable policies to Gemini
- Returns a `ResolutionPlan` with `goal`, `approach`, `workflowSteps[]`, `estimatedResolutionMins`, `customerImpact`, `risksIdentified`
- Each `WorkflowStep` has: `id`, `label`, `description`, `action`, `status: pending`, `safeToAuto`
- Fallback: deterministic planner based on intent + order value
- `shouldEscalate()` is called after planning — overrides the plan if escalation triggers apply

### Stage 4: Act (`src/lib/workflow/actions.ts`)
- Executes all `safeToAuto=true` steps in sequence
- Stops at first unsafe step (leaves subsequent steps pending for human approval)
- Each step gets a **SHA-256 idempotency key** (`caseId:stepId:action`) — prevents double-execution of financial actions on crash/retry
- Action types: `refund | replacement | cancel | address_update | issue_credit | send_response | schedule_callback | escalate`
- After execution: calls `draftResponse()` to generate customer-facing reply (Gemini)

### LLM Gateway (`src/lib/ai/llm.ts`)
All LLM calls go through `callLLMJSON<T>()`:
1. PII redaction (email, phone, CC, SSN → placeholders)
2. Prompt injection sanitization (removes "ignore previous instructions" etc.)
3. Circuit breaker (5 failures → open 60s → half-open probe × 3)
4. Retry with exponential backoff (3 attempts, 1s→8s, only on timeout/network errors)
5. 8 second timeout
6. JSON extraction (handles fences, prose, bracket-scanning)
7. Prometheus metrics for duration + success/failure

Model: `gemini-2.0-flash`. Change `GEMINI_MODEL` constant in `llm.ts` to switch.

---

## Workflow State Machine (`src/lib/workflow/stateMachine.ts`)

```
new → classified → retrieved → planned → acted → resolved
                                                ↓
                                            escalated
```

Backward transitions are supported (e.g. `classified → new` if classification rejected). Full transition table:

| From | Can go to |
|---|---|
| `new` | `classified` |
| `classified` | `retrieved`, `new` |
| `retrieved` | `planned`, `classified` |
| `planned` | `acted`, `retrieved`, `classified` |
| `acted` | `resolved`, `escalated`, `planned` |
| `resolved` | `escalated` |
| `escalated` | `acted`, `resolved`, `planned` |

`canTransition(from, to)` is called before every status update — invalid transitions are silently no-ops (keeps the current status).

---

## Rule Engine (`src/lib/workflow/rules.ts`)

Maps intents → policy codes → pass/fail evaluation.

`evaluateRules()` checks facts (days since delivery, order total, order status, sentiment, days late) against each applicable policy and returns `RuleEvaluation[]`.

`shouldEscalate()` checks: furious sentiment, order ≥ $500, automationSafe=false, or any ESCALATE-prefixed policy passing.

---

## Auth (`src/lib/auth/`)

- NextAuth v4, credentials provider, JWT strategy
- Password stored as `sha256("tentacle-demo-salt" + password)` — **demo only**
- Role hierarchy: `agent(1) < manager(2) < admin(3)`
- `requireAuth()` — throws 401 if not logged in
- `requireRole(minRole)` — throws 403 if insufficient role
- Session: 8 hours, user id/role/avatarHue in JWT
- All API routes call `requireAuth()` at the top except `/api/health`

---

## Learning Layer (`src/lib/ai/learning.ts`)

Every time a human overrides an AI decision, a `CaseLearningEntry` is created. On retrieval for future cases with similar context, the system:
1. Looks up past overrides matching the same `{ intent, sentiment, urgency }`
2. Computes `overrideRate = overrides / totalSimilarCases`
3. Applies `confidenceDelta = -overrideRate * 0.3` to the AI confidence
4. Returns learning entries alongside retrieval hits so the UI can show "AI has been overridden X times in similar cases"

---

## Observability

### Logger (`src/lib/observability/logger.ts`)
Structured JSON logger. Uses `AsyncLocalStorage` for request-scoped correlation IDs. Levels: `debug | info | warn | error`. In dev: pretty-prints to console.

### Metrics (`src/lib/observability/metrics.ts`)
In-memory Prometheus-compatible counters, histograms, and gauges. Exported at `GET /api/metrics` in Prometheus text format.

Key metrics tracked:
- `llm.call_duration_ms` (histogram) — per LLM call latency
- `llm.call_success` / `llm.call_failure` (counters)
- `llm.injections_blocked` (counter)
- `workflow.refunds_issued`, `workflow.replacements_issued`, `workflow.cancellations`, etc.
- `workflow.refund_amount_cents` (histogram)
- `workflow.step_duration_ms` (histogram per action type)

**Vercel note:** In-memory metrics reset per serverless invocation. For persistent metrics on Vercel, swap to Upstash Redis or Vercel KV.

---

## Security

### PII Redaction (`src/lib/security/pii.ts`)
Applied to every user prompt before it reaches the LLM. Replaces emails, phone numbers, credit cards (13–19 digit patterns), and SSNs with placeholders like `[EMAIL]`, `[PHONE-ENDING-1234]`. Original message is stored in DB unredacted.

### Prompt Injection Sanitization (`src/lib/security/pii.ts`)
Removes patterns like "ignore previous instructions", "you are now", system tags (`[INST]`, `<|im_start|>`), and code blocks from user input. Input truncated at 4000 chars.

### Rate Limiting (`src/lib/security/rateLimit.ts`)
Sliding window in-memory rate limiter. `getClientIdentifier(request)` extracts IP from `x-forwarded-for` / `x-real-ip`. **Not persistent on Vercel** — each invocation gets a fresh store. Replace with Upstash Redis for production multi-instance rate limiting.

---

## Resilience

### Circuit Breaker (`src/lib/resilience/circuitBreaker.ts`)
Guards all Gemini calls. Config: `failureThreshold=5`, `resetTimeout=60s`, `halfOpenMaxAttempts=3`.
- `closed` → normal operation
- `open` → fast-fails all calls until 60s elapses
- `half-open` → allows 3 probe calls, transitions back to `closed` on success or `open` on failure
- State exposed on `/api/health`

### Retry (`src/lib/resilience/retry.ts`)
Exponential backoff: `baseDelay=1s`, `maxDelay=8s`, `maxAttempts=3`. Only retries on timeout and network errors — not on JSON parse failures (retrying a malformed response is pointless).

---

## Frontend Architecture

### Global State (`src/store/appStore.ts` — Zustand)
Single store holds everything:
- `view` + `selectedCaseId` — navigation state
- `cases`, `customers`, `orders`, `policies`, `audit`, `metrics`, `learningEntries` — all fetched data
- `settings` — AppSettings
- `filterStatus`, `filterUrgency`, `filterIntent`, `searchQuery` — inbox filter state
- `processingStage` — shows progress while AI pipeline runs
- `mobileNavOpen`, `commandPaletteOpen` — UI state

### Views (rendered by Shell based on `view`)
| View key | Component | What it shows |
|---|---|---|
| `dashboard` | DashboardView | Metrics cards, charts (case volume, intent breakdown, sentiment, workflow funnel) |
| `inbox` | CaseInboxView | Filterable/searchable case list |
| `case` | CaseDetailView | Full case: AI panels, workflow timeline, audit trail, action buttons |
| `escalations` | EscalationQueueView | All escalated cases |
| `ledger` | DecisionLedgerView | History of all AI decisions |
| `audit` | AuditLogView | Full immutable audit trail |
| `settings` | SettingsView | AppSettings editor |
| `intake` | IntakeView | Manual ticket submission form |

### Key Case Detail Panels
- `ReasoningPanel` — AI classification breakdown
- `DecisionExplainerPanel` — why the AI made each decision
- `BusinessImpactPanel` — financial impact simulation
- `CustomerPanel` — customer profile + order history
- `WorkflowTimeline` — visual pipeline stage tracker
- `ResponseDraft` — editable AI-drafted customer reply
- `KnowledgeRetrieval` — retrieved policies + similar cases
- `ActionDrawer` — buttons to run each pipeline stage
- `AuditTrail` — case-level audit log
- `LearningHistoryPanel` — past overrides for this case
- `OverrideFeedbackDialog` — records human override + learning entry

---

## Environment Variables

```env
DATABASE_URL=file:./db/custom.db          # SQLite (local) or postgresql://... (Vercel)
GEMINI_API_KEY=...                         # From https://aistudio.google.com/apikey
NEXTAUTH_URL=http://localhost:3000         # Full URL of the deployment
NEXTAUTH_SECRET=...                        # Random string, min 32 chars in production
```

---

## Running Locally

```bash
npm install
npm run db:push        # Create/sync SQLite schema
npx tsx prisma/seed.ts # Seed demo data
npm run dev            # Start on http://localhost:3000
```

Demo credentials:
- Agent: `avery@marigold.co` / `demo1234`
- Manager: `bennett@marigold.co` / `demo1234`
- Admin: `admin@marigold.co` / `admin1234`

---

## Deploying to Vercel

1. Push to GitHub
2. Import repo in Vercel
3. Set environment variables: `GEMINI_API_KEY`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `DATABASE_URL`
4. For `DATABASE_URL`: provision a Postgres DB (Neon or Supabase), update `prisma/schema.prisma` provider from `"sqlite"` to `"postgresql"`, run `prisma migrate deploy`
5. Rate limiting and metrics will be per-invocation (in-memory) — swap to Upstash Redis for persistence

**`vercel.json`** sets `maxDuration: 30` on all API routes (AI calls can take 5–10s).

---

## Revenue Agent Module (New)

### Overview
The Revenue Agent is an autonomous sales employee — not a chatbot. Leads flow through a 13-step pipeline from research to invoice collection. All intelligence is visible and explainable in the UI.

### ViewKey
`"revenue"` — added to the `ViewKey` union in `appStore.ts`.

### New Store Slice (`src/store/appStore.ts`)
| Field | Type | Description |
|---|---|---|
| `leads` | `Lead[]` | Active sales leads |
| `conversations` | `Conversation[]` | Omnichannel conversations |
| `aiAgents` | `AIAgent[]` | 9 AI workforce agents |
| `revenueMetrics` | `RevenueMetrics` | Executive KPIs |
| `selectedLeadId` | `string \| null` | Currently selected lead |

### New Components (`src/components/revenue/`)

| File | What it does |
|---|---|
| `RevenueAgentView.tsx` | Main 3-column layout: lead list + lead detail tabs + omnichannel inbox/workforce |
| `LeadProfilePanel.tsx` | Premium lead intelligence: score ring, signals, predicted revenue, LTV, decision maker confidence |
| `AISalesStrategyPanel.tsx` | Strategy display with close probability ring, negotiation plan, alternatives, expandable AI reasoning |
| `RevenueSimulatorPanel.tsx` | Business impact simulator: expected revenue, profit, ROI, retention, risk, alternative comparison |
| `LiveAIPipeline.tsx` | Animated 13-step pipeline showing real-time stage execution with check/spin/pending states |
| `OmnichannelInbox.tsx` | Unified inbox across WhatsApp, Instagram, Web Chat, Email, Messenger with AI status + buying intent |
| `AIWorkforceWidget.tsx` | Collapsible widget showing all 9 AI agents with status, current task, latency, confidence |
| `ExecutiveMetricsStrip.tsx` | 8-metric KPI strip: Today's Revenue, Revenue Protected, Auto-Closed Deals, etc. |

### Mock Data (`src/lib/data/revenueData.ts`)
5 leads with full intelligence + strategy, 6 omnichannel conversations, 9 AI agents, revenue metrics.

### Modified Files
- `src/store/appStore.ts` — added revenue slice + `"revenue"` ViewKey
- `src/components/layout/Sidebar.tsx` — Revenue Agent nav item, Gemini AI status widget, active agent count
- `src/components/layout/Shell.tsx` — registered `RevenueAgentView`
- `src/components/dashboard/DashboardView.tsx` — ExecutiveMetricsStrip + AIWorkforceWidget added
- `src/components/cases/DecisionLedgerView.tsx` — Revenue Impact + Learning Applied columns added
- `src/lib/db/queries.ts` — removed stale `createdAt` from AIAgent serializer

### Pipeline Types (`src/types/revenue.ts`)
`REVENUE_PIPELINE` — 13 stages: receive → research → CRM → memory → analyze → LTV → probability → strategy → negotiate → quote → meeting → invoice → learn

### Navigation
Revenue Agent appears second in sidebar (after Overview), with an active-leads badge. Separator line divides revenue-ops items from support items.

---

| Issue | Where | Fix |
|---|---|---|
| SHA-256 password hashing (no salt rounds) | `authOptions.ts` | Replace with `bcrypt` |
| In-memory rate limiting | `rateLimit.ts` | Upstash Redis `@upstash/ratelimit` |
| In-memory metrics | `metrics.ts` | Upstash Redis or Prometheus push gateway |
| SQLite in production | `schema.prisma` | PostgreSQL (Neon/Supabase) |
| No CSRF protection | API routes | Add `next-csrf` or check `Origin` header |
| LLM client singleton shared across invocations | `llm.ts` | Fine for serverless (cold start recreates) |
| `customer` param unused in `evaluateRules` | `rules.ts` | Add LTV-based escalation rule |
| `examples/websocket/` excluded from TS | `tsconfig.json` | Not deployed, safe to ignore |

---

## File Change Map

When touching a feature, these files are typically involved:

| Feature | Files |
|---|---|
| AI model / prompts | `src/lib/ai/llm.ts`, `src/lib/ai/classify.ts`, `src/lib/ai/planner.ts`, `src/lib/ai/responder.ts` |
| New case status / transition | `prisma/schema.prisma`, `src/lib/workflow/stateMachine.ts`, `src/types/index.ts` |
| New policy | `prisma/seed.ts`, `src/lib/workflow/rules.ts` |
| New workflow action | `src/lib/workflow/actions.ts`, `src/lib/ai/planner.ts` |
| New API route | `src/app/api/<name>/route.ts`, `src/lib/validation/apiSchemas.ts` |
| Dashboard metric | `src/lib/db/queries.ts`, `src/components/dashboard/` |
| Settings option | `prisma/schema.prisma`, `src/types/settings.ts`, `src/app/api/settings/route.ts`, `src/components/cases/SettingsView.tsx` |
