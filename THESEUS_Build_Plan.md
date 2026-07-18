# THESEUS — 3-Person Build Plan
### Phasewise task split + copy-paste prompts for an agentic IDE (Cursor / Claude Code / Windsurf)

---

## 0. How to use this doc

- **Seed Prompt** runs once, by whoever sets up the shared repo, before the team splits up.
- Each person then owns a **track**, broken into **4 phases**. Phases are designed to run roughly in parallel across all three people, with sync points at the end of each phase (see §5).
- Every prompt below is written to be pasted **as-is** into an agentic coding IDE. They assume the repo from the Seed Prompt already exists. Adjust file paths if your IDE scaffolds differently.

**Team split (mirrors the PRD's own separation of concerns):**

| Person | Track | Owns |
|---|---|---|
| **A** | Data & Backend Infrastructure | Data Onboarding Agent, PostgreSQL schema, validated query library, ingestion pipeline |
| **B** | AI / Analytics Core | Analytics Agent (deterministic math), Monte Carlo engine, Course of Action Agent, Document Intelligence Agent (RAG), Gemma orchestration |
| **C** | Frontend & Visualization | Next.js dashboard, Ship visualization, AI Chat UI, voice/photo upload UI |

---

## 1. Seed Prompt (run once, shared repo)

```
Set up a monorepo for a hackathon project called THESEUS, an AI-powered SME cash flow copilot.

Create this structure:

theseus/
  frontend/          Next.js 14 (App Router) + TypeScript + Tailwind CSS
  backend/           FastAPI (Python 3.11)
    agents/
      onboarding/
      analytics/
      course_of_action/
      document_intelligence/
    db/
      migrations/
      schema.sql
    core/
      config.py
      gemma_client.py
    main.py
  shared/
    types/           TypeScript + Python (pydantic) mirrored data contracts
  docker-compose.yml
  .env.example
  README.md

Requirements:
1. Backend: FastAPI app with CORS enabled for localhost:3000, a /health endpoint, and a modular router setup where each agent (onboarding, analytics, course_of_action, document_intelligence) gets its own APIRouter mounted under /api/{agent_name}.
2. Frontend: Next.js with Tailwind configured, a placeholder dashboard page at /dashboard and a placeholder ship view at / (home page).
3. Database: PostgreSQL via Supabase (or local Postgres for dev). Write schema.sql with these tables and reasonable columns/types/foreign keys: transactions, revenue, expenses, customers, vendors, invoices, payments, cash_balances, gst_data, forecast_data, reliability_scores, anomalies. Include created_at/updated_at timestamps on all tables and an org_id / business_id foreign key on every table for multi-tenant safety even though we'll only demo one business.
4. Vector DB: add a pgvector extension setup script (documents table with id, source_type, source_name, chunk_text, embedding vector(768), metadata jsonb) as an alternative to Pinecone — default to pgvector for hackathon simplicity, but keep the embedding/retrieval code behind an interface (VectorStore) so it could swap to Pinecone later.
5. Gemma client: core/gemma_client.py — a thin wrapper class GemmaClient with methods for text completion, function-calling completion (with tool schema passthrough), image input, and audio input, calling Gemma 12B via Google AI Studio API. Read the API key from env var GEMMA_API_KEY. Include a mock mode (env var GEMMA_MOCK=true) that returns canned responses, so frontend/backend integration doesn't block on API key availability.
6. .env.example with GEMMA_API_KEY, DATABASE_URL, VECTOR_DB (pgvector|pinecone), PINECONE_API_KEY (optional).
7. docker-compose.yml with a postgres service (with pgvector image) for local dev.
8. README.md explaining how to run frontend and backend locally, and a short "Architecture" section summarizing the four-agent pipeline (Onboarding → Analytics → Course of Action / Document Intelligence, orchestrated by Gemma, with all financial math deterministic in Pandas/NumPy/Prophet — never LLM-generated).

Do not implement business logic yet — this is scaffolding only. Every agent router should have one stub endpoint that returns {"status": "not implemented"} so the app runs end-to-end immediately.
```

---

## 2. Person A — Data & Backend Infrastructure

### Phase 1 — Schema + core backend plumbing
```
Working in theseus/backend/. Flesh out db/schema.sql (already scaffolded) into a complete, correct PostgreSQL schema for these tables: transactions, revenue, expenses, customers, vendors, invoices, payments, cash_balances, gst_data, forecast_data, reliability_scores, anomalies.

Requirements:
- transactions: id, org_id, date, amount, direction (inflow/outflow), category, counterparty_name, counterparty_type (customer/vendor/other), source_document_id (nullable), raw_description, is_duplicate_flag, created_at.
- invoices: id, org_id, customer_id, amount, issue_date, due_date, status (pending/paid/overdue), paid_date (nullable), linked_payment_id (nullable).
- payments: id, org_id, invoice_id (nullable, for matching), amount, date, method, matched_transaction_id (nullable).
- reliability_scores: id, org_id, entity_id, entity_type (customer/vendor), score (0-100), avg_delay_days, consistency_rating, last_computed_at.
- anomalies: id, org_id, type (duplicate_payment/spending_spike/missing_payment/revenue_drop), severity, related_transaction_id, description, detected_at, resolved boolean.
- forecast_data: id, org_id, horizon_days (30/60/90), p10, p50, p90, generated_at, model_version.
- Add appropriate indexes on org_id + date columns for every table (these will be queried constantly for dashboards).
- Write the corresponding SQLAlchemy models in backend/db/models.py and Alembic migration setup in backend/db/migrations/.
- Write backend/db/session.py with a get_db() dependency for FastAPI using SQLAlchemy's sessionmaker, reading DATABASE_URL from env.

Then implement backend/core/query_library.py: a set of named, parameterized, injection-safe query functions — NOT arbitrary SQL — that will later be exposed to Gemma via function calling. Implement at minimum:
- get_current_cash_balance(org_id)
- get_monthly_revenue(org_id, month)
- get_outstanding_invoices(org_id, min_days_overdue=0)
- get_vendor_payments(org_id, vendor_id=None, since=None)
- get_cash_runway(org_id) — reads latest forecast_data
- get_profit_loss(org_id, start_date, end_date)

Each function returns clean JSON-serializable dicts, not ORM objects. Add docstrings describing exact inputs/outputs since Person B will wrap these as Gemma function-calling tools.
```

### Phase 2 — Data Onboarding Agent
```
Working in theseus/backend/agents/onboarding/. Build the Data Onboarding Agent.

1. parsers.py: implement parse functions for CSV, Excel (.xlsx), and PDF bank statements. Use pandas for CSV/Excel. For PDF, use pdfplumber to extract transaction tables; if the PDF has no extractable table (scanned/image-based), fall back to calling GemmaClient's image method (rasterize the PDF page first) for OCR-based extraction.
2. photo_parser.py: accept an uploaded photo of a paper invoice/receipt, call GemmaClient.image() with a prompt instructing Gemma to extract structured fields (vendor name, amount, date, line items) and return them via function calling with a strict JSON schema — no free text response allowed, only the tool call.
3. voice_parser.py: accept an audio clip (≤30s), call GemmaClient.audio() to transcribe AND extract a structured transaction (amount, direction, counterparty, category) in one call via function calling.
4. normalizer.py: every parser above must output the SAME uniform schema regardless of source modality: {date, amount, direction, category, counterparty_name, counterparty_type, raw_description, source_type, confidence}. Write normalize_to_schema() as the single funnel point all parsers pass through before DB insert.
5. dedup.py: implement duplicate detection — flag a transaction as is_duplicate_flag=true if another transaction exists with the same org_id, amount, counterparty, and date within a 2-day window. This should run before insert, not just as an analytics-layer anomaly (that's a separate, softer signal Person B handles).
6. categorizer.py: use Gemma function calling to assign each transaction a category from a fixed enum (revenue, cogs, payroll, rent, utilities, tax, loan_payment, marketing, other) — pass the fixed category list in the tool schema so Gemma can only pick from it, never invent categories.
7. invoice_matcher.py: match incoming payments to outstanding invoices by amount + counterparty + date proximity; update invoice status to 'paid' and set linked_payment_id when matched confidently, otherwise leave pending and surface as an unmatched_payment for the dashboard.
8. Wire all of this into backend/agents/onboarding/router.py with endpoints: POST /api/onboarding/upload (file: csv/xlsx/pdf), POST /api/onboarding/photo, POST /api/onboarding/voice, GET /api/onboarding/status/{job_id}. Processing should be async (use FastAPI BackgroundTasks or a simple in-memory job queue for the hackathon) so uploads don't block the request.

Every insert must go through normalizer.py → dedup.py → categorizer.py → DB, in that order, regardless of entry point.
```

### Phase 3 — Continuous ingestion + integration with Analytics
```
Working in theseus/backend/. Implement the "continuous ingestion" story from the PRD (Section 8) and wire Person A's query library into Gemma function calling.

1. simulated_feed.py: a script/scheduled job (APScheduler is fine) that, when running in DEMO_MODE=true, inserts one new day's worth of pre-seeded synthetic transactions every N seconds/minutes (configurable), running them through the SAME onboarding pipeline (normalizer → dedup → categorizer) as real uploads — not a shortcut insert. Include a seed dataset generator (seed_data.py) that produces 90 days of plausible SME transaction history for a fictional business (mix of revenue, COGS, payroll, rent, a few overdue invoices, one duplicate payment, one spending spike) so Person B and Person C have realistic data to build against immediately.
2. sync.py: implement a manual sync trigger endpoint POST /api/onboarding/sync/{source_id} that only pulls transactions with a timestamp after the source's last_synced_at, then updates last_synced_at. For the hackathon, "source" can be a mocked connector that just returns the next unconsumed batch from the seed dataset.
3. Expose backend/core/query_library.py functions (from Phase 1) as Gemma function-calling tool schemas in backend/core/tools.py — one JSON schema per function, matching Gemma's function-calling format exactly, with strict typed parameters and clear descriptions (these descriptions are what Gemma reads to decide when to call each tool, so be precise).
4. Add integration tests confirming: uploading a CSV → transactions appear in DB with correct schema → duplicate upload gets flagged → simulated feed advances one day and reliability scores/forecast tables are stale-marked (a needs_recompute flag) so Person B's Analytics Agent knows to recompute.

Coordinate the needs_recompute flag naming exactly with Person B before implementing — it's the handoff contract between ingestion and analytics.
```

### Phase 4 — Hardening + demo data polish
```
Working in theseus/backend/. Polish the ingestion layer for demo reliability.

1. Add robust error handling to every parser in agents/onboarding/: malformed CSV, unsupported Excel format, unreadable PDF, corrupted image, audio clip over 30s or unintelligible speech. Each failure should return a clear, user-facing error message (for Person C's frontend to display), never a raw stack trace.
2. Add a POST /api/onboarding/reset-demo endpoint that wipes and re-seeds the database from seed_data.py, for reliable demo re-runs.
3. Tune the simulated daily feed so a full demo (90 days of history + a few days of live "new" transactions arriving) can be shown within a 5-minute demo window — make the feed interval configurable via env var.
4. Double check every table has org_id enforced and no query in query_library.py can leak cross-org data, even though we only demo one org — this is a trust/judging point (validated query library that can't misbehave).
5. Write a short ONBOARDING_HANDOFF.md documenting the exact schema, the needs_recompute flag contract, and all query_library.py function signatures for Person B and C to reference without reading your code.
```

---

## 3. Person B — AI / Analytics Core

### Phase 1 — Analytics Agent (deterministic math only)
```
Working in theseus/backend/agents/analytics/. This layer must contain ZERO calls to Gemma or any LLM — pure Pandas/NumPy/Scikit-learn/Prophet, reading only from PostgreSQL. Assume Person A's schema (transactions, invoices, payments, cash_balances, forecast_data, reliability_scores, anomalies) exists — if it's not ready yet, build against a mocked DataFrame matching that schema and swap the data source later.

Implement in analytics/core.py:
1. compute_cash_flow(org_id, start_date, end_date) → daily inflow, outflow, net cash flow, running balance.
2. compute_burn_rate(org_id, window_days=30) → average daily net outflow over the trailing window.
3. compute_runway(org_id) → current_cash_balance / burn_rate, in days, handling the case burn_rate <= 0 (i.e., business is cash-flow positive → return null/"not burning cash").
4. forecast_30_60_90(org_id) → use Facebook Prophet on the historical daily net cash series to produce point forecasts at 30/60/90 days. Return forecast dataframe with yhat, yhat_lower, yhat_upper per day.
5. compute_reliability_score(org_id, entity_id, entity_type) → score 0-100 based on: payment delay average, delay consistency (std dev), transaction frequency, on-time rate. Document your exact formula in a docstring — this needs to be explainable to a judge.
6. detect_anomalies(org_id) → scan for: duplicate payments (flag if not already caught at ingestion), spending spikes (z-score > threshold on category-level daily spend), missing expected payments (recurring vendor/customer pattern broken), revenue drops (week-over-week or month-over-month decline beyond threshold). Write each anomaly row into the anomalies table with type, severity, description.

Every function must be pure/testable — accept a DataFrame or org_id+DB session, return a DataFrame or typed dict, no side effects except the explicit DB writes in detect_anomalies and compute_reliability_score. Write unit tests with a small synthetic transaction set covering each function's edge cases (empty data, single transaction, all-inflow, all-outflow).
```

### Phase 2 — Monte Carlo engine
```
Working in theseus/backend/agents/analytics/monte_carlo.py. Build a NumPy-vectorized Monte Carlo simulation on top of the Prophet baseline from Phase 1.

Requirements:
1. Input: Prophet's forecast (yhat, yhat_lower, yhat_upper per day) plus historical daily net cash flow volatility (std dev).
2. Run N simulations (default 10,000, vectorized — no Python-level loops over simulations) where each day's net cash flow is sampled from a distribution centered on Prophet's yhat with variance derived from historical volatility, compounding forward to build N simulated cash balance paths over the 30/60/90 day horizon.
3. Output per horizon: P10, P50, P90 cash balance, and probability of shortfall (% of simulated paths where balance < 0 or < some configurable minimum threshold, e.g. next payroll amount).
4. Output a single scalar "volatility parameter" (e.g. normalized spread between P10 and P90 relative to P50) — this is the exact number the PRD says drives wave turbulence in the ship visualization. Name it clearly, e.g. forecast_confidence_volatility, range 0.0 (calm/confident) to 1.0 (choppy/uncertain), and document the normalization formula.
5. Output a single scalar "shortfall_risk" (0.0 to 1.0) — this drives storm cloud opacity in the ship view.
6. Write compute_monte_carlo(org_id, horizon_days) as the entry point, write results to forecast_data table (p10/p50/p90 columns from Phase 1's schema), and return the two scalar UI-driving parameters directly in the API response (don't make Person C re-derive them).
7. Performance target: full 10,000-path simulation across all three horizons should run in well under 2 seconds on a laptop — profile it and vectorize further if not.

Expose via backend/agents/analytics/router.py: GET /api/analytics/forecast/{org_id}?horizon=30|60|90 returning {p10, p50, p90, forecast_confidence_volatility, shortfall_risk}, and GET /api/analytics/summary/{org_id} returning the Executive Summary block (cash balance, net cash flow, burn rate, runway, liquidity score, risk level) for the dashboard.
```

### Phase 3 — Course of Action Agent + Document Intelligence Agent
```
Working in theseus/backend/agents/course_of_action/ and theseus/backend/agents/document_intelligence/. These two agents are the primary Gemma consumers.

PART 1 — Document Intelligence Agent (build first, Course of Action depends on it):
1. embeddings.py: chunking + embedding pipeline for uploaded documents (loan agreements, vendor contracts, GST notices, tax circulars, audit reports, policies, emails). Chunk by paragraph/section (~300-500 tokens), embed each chunk, store in the pgvector documents table from the Seed Prompt (chunk_text, embedding, metadata jsonb with source_name, section_label, page_number).
2. retrieval.py: given a query, embed it, do cosine-similarity top-k retrieval (k=5 default) from pgvector, filtered by org_id.
3. router.py: POST /api/documents/upload (ingest + embed a document), POST /api/documents/ask — takes a question, retrieves top-k chunks, calls Gemma with the retrieved chunks as context, a strict system prompt instructing Gemma to answer ONLY from the provided chunks and to explicitly say "I couldn't find this in your documents" if the answer isn't supported — and to always cite which chunk/document/section the answer came from. Return {answer, citations: [{source_name, section_label, excerpt}]}.

PART 2 — Course of Action Agent:
1. tools.py: register Person A's query_library.py functions AND this agent's own tools (Monte Carlo results, reliability scores, anomalies from Phase 1/2, and document_intelligence's ask function) as a unified Gemma function-calling toolset.
2. reasoning.py: implement the core orchestration loop — take a natural-language owner question, let Gemma (in thinking/reasoning mode) decide which tools to call (numbers from Agent 2 via query_library, document context from Agent 4 via RAG), synthesize a plain-language answer. Gemma NEVER computes a number itself — every quantitative claim in its answer must trace to a tool call result, not model-generated math. Add a system prompt that says this explicitly and instructs Gemma to call the relevant tool rather than estimate.
3. recommendations.py: generate the priority-tiered Recommendation Panel (High/Medium/Low) by having Gemma reason over Analytics Agent output (runway, anomalies, reliability scores) — e.g., low runway + one dominant customer overdue → High priority "follow up with Customer X." Recommendations must reference the specific underlying number (e.g., "23 days overdue, ₹40,000") not vague language.
4. drafting.py: draft invoice reminder/escalation messages in the customer's preferred language (pass target language as a parameter; Gemma handles translation natively) using the specific invoice/customer data as grounding — no invented amounts or dates.
5. router.py: POST /api/course-of-action/ask (chat Q&A), GET /api/course-of-action/recommendations/{org_id}, POST /api/course-of-action/draft-reminder/{invoice_id}?language=xx.
```

### Phase 4 — Chat quality, guardrails, weekly plan
```
Working across theseus/backend/agents/course_of_action/ and document_intelligence/. Tighten quality and add the remaining demo-flow pieces.

1. weekly_plan.py: generate the "prioritized weekly action plan" from Section 10 step 8 — combine current recommendations + one drafted invoice reminder for the highest-risk outstanding invoice into a single structured object the frontend can render as a checklist. Endpoint: GET /api/course-of-action/weekly-plan/{org_id}.
2. Guardrail pass: write a test harness (test_no_hallucination.py) that asks the Course of Action Agent 10-15 questions from Section 7's "AI Chat" examples ("Can I afford new equipment?", "Why is cash flow decreasing?", "Which customer is the riskiest?", "Predict next month's balance") plus a few adversarial ones designed to tempt Gemma into inventing numbers (e.g. "What will my balance be in exactly 47 days?" when only 30/60/90-day data exists). Assert every numeric claim in the response matches a real tool-call result; assert the agent declines or clarifies rather than guessing when data isn't available at that granularity.
3. Guardrail pass for Document Intelligence: test with a question that has NO answer in any uploaded document and confirm it responds with an explicit "not found in your documents" rather than inventing an answer.
4. Add response latency logging around every Gemma call; if the demo's live chat responses are too slow, add a streaming response option (Server-Sent Events) so the frontend can show partial answers.
5. Write AGENT_HANDOFF.md documenting every API endpoint you've built (request/response shapes) for Person C to integrate against without reading your code.
```

---

## 4. Person C — Frontend & Ship Visualization

### Phase 1 — Dashboard scaffold with mock data
```
Working in theseus/frontend/. Build the Dashboard (Secondary Layer per PRD Section 7) using Next.js App Router, TypeScript, Tailwind, and Recharts. Use realistic mock data (hardcoded JSON matching the shapes described below) — do not wait on backend integration.

Build these components under frontend/components/dashboard/:
1. ExecutiveSummary.tsx — cards for Current Cash Balance, Net Cash Flow, Burn Rate, Cash Runway, Liquidity Score, Risk Level. Risk Level should be a colored badge (green/amber/red).
2. CashFlowTrend.tsx — Recharts line/area chart: inflow, outflow, net cash, forecasted cash over time, with a visually distinct dashed line where forecast begins.
3. RevenueVsExpenses.tsx — Recharts grouped bar chart, monthly.
4. CashForecast.tsx — Recharts chart showing 30/60/90-day projected balances as P10/P50/P90 confidence bands (use an area chart with P10-P90 as a shaded band and P50 as a solid line).
5. ReceivablesPayables.tsx — two-column layout: outstanding invoices + expected payments on one side, vendor payments/salaries/rent/taxes on the other.
6. ReliabilityScores.tsx — ranked table of customers/vendors by reliability score, with delay/consistency/frequency sub-columns.
7. AIInsightsPanel.tsx — simple card list rendering short text insights (e.g. "Revenue increased by 11%").
8. RecommendationPanel.tsx — three tiers (High/Medium/Low), each a colored section with a list of action items.
9. AlertsBar.tsx — dismissible alert chips for low cash balance, GST due soon, salary due, overdue invoices, unusual expense.
10. Assemble all of these into frontend/app/dashboard/page.tsx in a clean grid layout (Executive Summary full-width top, then a 2-column layout below for the rest). Use the frontend-design conventions for spacing/typography — this should look like a polished fintech product, not a generic admin template.

Define all mock data shapes as TypeScript interfaces in frontend/types/dashboard.ts — Person A and B will match their API responses to these types later, so make them clean and well-named.
```

### Phase 2 — Ship visualization
```
Working in theseus/frontend/components/ship/. Build the signature Ship visualization from PRD Section 6 as a stylized 2D SVG/Canvas illustration — flat-shaded, Monument Valley-style. No real-time fluid physics; this should be a set of layered, animatable SVG elements driven by props, not a simulation.

Build ShipView.tsx accepting props matching this interface (define in frontend/types/ship.ts):
interface ShipViewProps {
  cashBalance: number;        // drives water level
  maxCashBalance: number;     // for normalizing water level to viewport
  runwayDays: number;         // drives ship height above waterline
  forecastVolatility: number; // 0.0-1.0, drives wave amplitude/turbulence
  shortfallRisk: number;      // 0.0-1.0, drives storm cloud opacity/density
  icebergs: { id: string; label: string; severity: 'low'|'medium'|'high'; onClick: () => void }[];
  islands: { id: string; label: string; distancePct: number; onClick: () => void }[]; // progress toward goals
  anomalySpikes: { id: string; positionPct: number; onClick: () => void }[]; // sudden wave spikes
  recommendationSummary: string; // short text driving captain's pose/animation
}

Implementation notes:
1. Water: an SVG path with a gentle sine-wave top edge; water level (vertical position) driven by cashBalance/maxCashBalance; wave amplitude driven by forecastVolatility (calm = near-flat, choppy = pronounced wave with subtle CSS animation looping the wave phase).
2. Ship: positioned so its draft (how low it sits) is driven by runwayDays — low runway = ship riding low/tilted, healthy runway = ship riding high and level. Include a simple captain figure at the helm.
3. Captain animation: a small state change (e.g. captain sprite rotates the wheel or adjusts a sail) triggered when recommendationSummary changes — this literalizes "Gemma's recommendations, the captain visibly reacts."
4. Storm clouds: rendered on the horizon, opacity/density scaled by shortfallRisk (near-invisible at low risk, dark and multiplying at high risk).
5. Icebergs: small SVG shapes poking above the waterline with a larger shape implied below (via a subtle gradient/fade beneath the waterline, hinting at "hidden mass"), one per item in `icebergs`, each clickable, colored by severity.
6. Islands/ports: rendered on the horizon at horizontal position = distancePct, each clickable.
7. Anomaly spikes: a localized sharp wave spike rendered at positionPct along the water's timeline axis, clickable.
8. Every interactive element (water body itself, each iceberg, each island, each spike) must call its onClick — wire these in Phase 3 to open the relevant dashboard modal/section, per "every visual element is clickable, opening the exact dashboard metric and formula behind it."
9. Keep this performant and crisp at both a laptop screen size and projector resolution — test at 1920x1080 minimum.

For now, drive ShipView with the same mock data shape as Phase 1's dashboard so it's fully demoable standalone.
```

### Phase 3 — Live integration + Chat/upload UI
```
Working in theseus/frontend/. Two workstreams:

PART 1 — Backend integration:
1. Create frontend/lib/api.ts with typed fetch wrappers for every backend endpoint documented in Person A's ONBOARDING_HANDOFF.md and Person B's AGENT_HANDOFF.md (adjust these exact paths once those files exist).
2. Replace all mock data in dashboard components and ShipView with real API calls, using SWR or React Query for caching/revalidation (poll or use a lightweight subscription so the ship/dashboard reflect the simulated daily feed advancing without a manual refresh).
3. Wire every ShipView onClick handler to open a modal/drawer showing the exact underlying dashboard metric/formula it represents (iceberg click → opens that anomaly or overdue invoice's detail row; water click → opens Cash Flow Trend; wave click → opens Cash Forecast with the P10/P50/P90 band highlighted).

PART 2 — Input UI:
1. UploadWidget.tsx — drag-and-drop file upload (CSV/Excel/PDF) posting to onboarding endpoints, with upload progress and clear error states matching Person A's error messages.
2. PhotoCaptureWidget.tsx — camera/file input for photographing a paper invoice, preview before submit.
3. VoiceNoteWidget.tsx — record-a-voice-note UI (MediaRecorder API), ≤30s enforced client-side with a visible countdown, waveform visualization while recording, posts to the voice endpoint.
4. ChatPanel.tsx — the AI Chat UI: text input + voice input toggle, message history, renders Gemma's answers with inline citation chips when Document Intelligence citations are present (clicking a citation shows the source excerpt), and a "thinking" indicator while waiting on the backend.
5. Add a persistent language selector that's passed to any drafting/chat calls, for the multilingual drafting feature.

Build a simple global layout (frontend/app/layout.tsx) with nav between Ship view (home) and Dashboard, plus a floating ChatPanel accessible from both.
```

### Phase 4 — Polish, animation, deploy
```
Working in theseus/frontend/. Final polish pass for demo day.

1. Add a DEMO_MODE toggle (env var or UI switch) that, when on, visibly speeds up / highlights the simulated daily feed advancing (e.g. a brief toast "New transactions synced" plus a subtle water-level ripple animation) so judges visibly see continuity, per Section 8.
2. Smooth all transitions: water level changes, wave amplitude changes, and cloud opacity changes should animate (CSS transitions, 400-800ms) rather than snap, so the ship feels alive as data updates.
3. Add loading skeletons for every dashboard panel and the ship view for the initial load state.
4. Responsive/projector check: verify layout at 1920x1080 and on a laptop screen; increase base font sizes and contrast if needed for projector legibility per the PRD's stated goal ("reads clearly on a projector").
5. Add a "Reset Demo" button in a settings/dev menu that calls Person A's reset-demo endpoint, for reliable re-runs between practice sessions.
6. Final integration smoke test: run through the full Section 10 Demo Flow end-to-end (upload → parse → ship renders → click iceberg → ask a question → ask a document question → weekly plan appears) and fix any breakage.
7. Deploy frontend to Vercel, confirm it correctly points at the deployed (or tunneled, e.g. ngrok) backend for demo day, and document the deployed URL in the README.
```

---

## 5. Integration Sync Points

Run these checks together (all three people, 15-30 min) at the end of each phase — don't let them slip to the end:

| After Phase | Sync check |
|---|---|
| 1 | Person A's `query_library.py` signatures match what Person B expects to wrap as Gemma tools. Person C's mock data TypeScript shapes match what Person A/B's schema will actually produce. |
| 2 | Person B's Monte Carlo output (`forecast_confidence_volatility`, `shortfall_risk`) matches exactly the prop names Person C's `ShipView` expects. Person A's `needs_recompute` flag contract confirmed with Person B. |
| 3 | Full live data path works: upload (A) → analytics/RAG (B) → renders on ship + dashboard + chat (C). Fix any schema/shape mismatches immediately — this is the highest-risk integration point. |
| 4 | Full Section 10 demo flow rehearsed end-to-end by all three together, with `DEMO_MODE`/reset working reliably. |

---

## 6. Final Demo Prep Prompt (shared, run last)

```
Review the full THESEUS repo (frontend + backend). Walk through the Section 10 Demo Flow from THESEUS_PRD.md exactly as a judge would see it:
1. Upload a bank statement / photograph an invoice / voice-log a transaction.
2. Confirm the ship view updates (water level, waves, clouds) and the dashboard's numbers match exactly.
3. Click an iceberg and confirm it opens the correct underlying metric.
4. Ask "Can I afford new equipment?" via chat and confirm the answer cites real tool-derived numbers, not invented ones.
5. Ask a document-specific question (e.g. "Does my loan allow early repayment?") and confirm a citation is shown.
6. Load the weekly action plan and confirm it includes a drafted invoice reminder in a non-English language.

Fix any step that breaks, is slow (>3s), or shows a raw error to the user. Do not add new features at this stage — only fix breakage and rough edges in the existing flow.
```
