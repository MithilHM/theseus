# THESEUS
### AI-Powered SME Financial Copilot — Product Requirements Document

**Tagline:** *Steering your business through every current.*

**Track:** Track 1 — Gemma SME Cashflow Copilot

---

## 1. Problem Statement

SMEs generate financial data constantly — bank statements, invoices, payment histories — but existing tools stop at visualization. They show a dashboard number like "Net Cash Flow = ₹45,000" and leave the owner to interpret what it means and what to do next. SME owners are rarely trained financial analysts; they need a system that tells them, in plain language, what is about to happen to their business and what specific action to take — before the problem becomes a crisis.

## 2. Concept

THESEUS is an AI financial copilot built around a strict separation of concerns: **all financial computation is deterministic and auditable** (SQL, Pandas, NumPy, Prophet, Monte Carlo), while **Gemma is used exclusively for language and orchestration** — retrieving the right data, explaining results, answering questions, and drafting communications. Every number in the product traces back to a formula, not a language model.

**Why THESEUS:** the name evokes navigation through danger and a vessel that endures by being renewed piece by piece — a fitting metaphor for a business staying afloat and rebuilding its financial health over time. This becomes literal in the product's signature visualization (Section 6).

**The differentiation problem we're solving for ourselves:** most teams on this track will converge on the same shape — parse statements, forecast, dashboard, LLM summary. THESEUS keeps that dashboard (it has to — the underlying rigor matters), but leads with a distinct, emotionally legible front end: a ship on water, with Gemma as captain.

---

## 3. System Architecture — Four-Agent Pipeline

| # | Agent | Responsibility | Data Source | Gemma Capability Used |
|---|---|---|---|---|
| 1 | **Data Onboarding Agent** | Parses CSV / Excel / PDF / photographed documents / voice-note transactions. Normalizes all input into a uniform structured schema, validates, deduplicates, categorizes, matches invoices to payments. | → PostgreSQL | Native image input (OCR, handwriting, document parsing), native audio input (voice-note transaction logging, ≤30s clips), function calling for structured JSON output |
| 2 | **Analytics Agent** | All quantitative work: cash flow computation, burn rate, runway, 30/60/90-day forecasts, reliability scoring, anomaly detection (duplicate payments, spending spikes, missing payments, revenue drops), Monte Carlo risk simulation. | PostgreSQL only | **None.** Pure Pandas / NumPy / Scikit-learn / Prophet. No AI-generated math anywhere in this layer. |
| 3 | **Course of Action Agent** | Orchestrates Agents 2 and 4's output into recommendations, prioritized action plans, invoice escalation drafting, scenario planning, conversational Q&A. | Reads from PostgreSQL (numbers) + Vector DB via RAG (context) | Advanced reasoning (thinking mode), long context, RAG orchestration |
| 4 | **Document Intelligence Agent** | Ingests and answers questions over unstructured documents: loan agreements, vendor contracts, GST/tax notices, tax circulars, audit reports, company policies, email conversations, unparsed bank statement text. Retrieves and cites the specific clause used — no clause found, no answer invented. | Vector DB (embedded documents) | RAG, thinking mode |

**The throughline:** structured, numeric, or legal-consequence data is never left to model memory. Agent 2 computes numbers deterministically. Agent 4 grounds every legal/tax claim in retrieved source text. Agent 3 only reasons on top of what 2 and 4 hand it, never inventing either.

---

## 4. Data Layer — Structured DB vs. Vector DB

RAG does not apply to structured, precisely-queryable data — SQL does that better, with exact correctness rather than semantic-similarity retrieval. The split:

### Structured Database (PostgreSQL) — system of record
Stores: transactions, revenue, expenses, customers, vendors, invoices, payments, cash balances, GST data, forecast data.

Used for exact-answer queries:
- Current cash balance
- Monthly revenue
- Outstanding invoices
- Vendor payments
- Cash runway
- Profit / loss

**Query constraint (hackathon-safe, and a trust feature):** Gemma does not generate arbitrary free-form SQL against production data. It selects from a validated, parameterized query library (the list above) via function calling. This is a stronger trust story than open text-to-SQL — "Gemma selects from a validated query set, it never writes arbitrary SQL."

### Vector Database — for documents that cannot be tabulated
Only used for unstructured text:
- Loan agreements
- Vendor contracts
- GST notices / tax circulars
- Audit reports
- Company policies
- Email conversations
- Bank statement text that wasn't parsed into structured fields

Purpose: answer document-related questions, explain legal/financial clauses, retrieve supporting evidence, provide document-aware responses — always with the source clause cited.

**Why not put everything in the vector DB:** Monte Carlo inputs, reliability scores, and cash balances need exact retrieval, not similarity search. Financial numbers never live only in a vector store.

### Long Context vs. RAG — the actual distinction
- **Long context** handles what's *bounded and current*: a single conversation thread, one full bank statement, the current forecast — loaded in full, every time.
- **RAG** handles what's *cumulative and grows unboundedly*: years of past communications, an ever-expanding library of contracts and tax notices. These can't be reloaded in full into every prompt indefinitely — RAG retrieves only what's relevant.

---

## 5. Gemma's Responsibilities (Orchestration, Not Computation)

Gemma acts as an intelligent orchestrator. It can:
- Select and invoke validated SQL query templates
- Interpret query results in plain language
- Retrieve relevant documents through RAG and cite the source clause
- Explain financial metrics
- Reason over Analytics Agent output to identify and explain risks (not detect them — detection is deterministic)
- Recommend actions
- Draft communications (invoice reminders, escalations) in the owner's or customer's language (multilingual, 140+ languages)
- Accept voice and photographed-document input natively

---

## 6. Signature Visualization — The Ship

The dashboard remains the "prove it" layer — full KPIs, exact numbers, every value traceable to its formula. The ship view is the **front-and-center, glanceable layer** that sits alongside it, not a replacement for it. Every visual element on the ship is clickable, opening the exact dashboard metric and formula behind it.

**Framing for the pitch:** *"The ship is not replacing the dashboard — it's the emotional front end to the same deterministic backend."*

### Metric → Visual Mapping

| Financial Concept | Ship/Water Visual | Notes |
|---|---|---|
| Cash balance | Water level | Rises and falls continuously as balances change |
| Runway / liquidity buffer | Ship's height above the waterline | A ship riding low reads instantly as "burning cash fast" |
| Monte Carlo forecast confidence (P10/P90 spread) | Water turbulence / wave height | Calm water = tight, confident forecast. Choppy water = wide uncertainty band |
| Predicted future shortfall risk | Storm clouds on the horizon | Visible before they arrive — literalizes "proactive, not reactive" |
| Gemma's recommendations (Course of Action Agent) | Captain adjusting the sail / steering wheel | Recommendations aren't just printed — the captain visibly reacts |
| Specific risk events (e.g. a reliability-score drop, large overdue invoice) | Icebergs | Hidden mass below the surface — risk not obvious from the surface number alone |
| Growth targets, loan payoff dates, milestones | Islands / ports on the horizon | Distance to port = progress toward a financial goal |
| Anomalies (duplicate payment, spending spike) | Sudden wave / turbulence spike at a specific point | Draws the eye to *when* it happened, not just that it happened |

### Design notes
- Stylized 2D illustration (flat-shaded, Monument Valley–style), not real-time 3D water physics — reads clearly on a projector, far lower build risk than a fluid simulation.
- Wave amplitude driven by a single volatility parameter from the Monte Carlo output; water height driven directly by current cash balance; cloud opacity/density driven by shortfall probability.
- Every element is interactive: tapping a wave opens the forecast band chart, tapping the water level opens the cash flow trend, tapping an iceberg opens the specific risk/customer/vendor record.

---

## 7. Dashboard Components (Secondary Layer)

**Executive Summary:** Current Cash Balance, Net Cash Flow, Burn Rate, Cash Runway, Liquidity Score, Risk Level.

**Cash Flow Trend:** inflow, outflow, net cash, forecasted cash.

**Revenue vs. Expenses:** monthly comparison chart.

**Cash Forecast:** 30/60/90-day projected balances (P10/P50/P90 bands).

**Receivables & Payables:**
- Incoming: outstanding invoices, expected payments
- Outgoing: vendor payments, salaries, rent, taxes

**Customer / Vendor Reliability Scores:** ranked by payment delays, consistency, delivery reliability, transaction frequency.

**AI Insights Panel:** e.g. "Revenue increased by 11%," "Cash flow is expected to decline next month," "Three customers account for 72% of incoming cash."

**Recommendation Panel (priority-tiered):**
- High: "Follow up with Customer ABC," "Reduce discretionary spending"
- Medium: "Negotiate Vendor XYZ payment terms"
- Low: "Invest surplus cash"

**Alerts:** low cash balance, GST due soon, salary due, multiple overdue invoices, unusual expense detected.

**AI Chat:** "Can I afford new equipment?" / "Why is cash flow decreasing?" / "Which customer is the riskiest?" / "Predict next month's balance."

**Document Intelligence summaries:** e.g., auto-generated bank statement summary — transaction count, credits, debits, closing balance, key findings (revenue increase, payroll increase, overdue payments, unusual expenses).

---

## 8. Data Ingestion — Continuous, Not One-Time

A single upload undersells the product. Hackathon-feasible approach to "continuous" ingestion:
- **Simulated daily feed:** scheduled job introduces a new day's transactions into the pipeline, demoing continuity without requiring live bank aggregation infrastructure.
- **Manual sync trigger:** owner connects a source once; subsequent syncs pull only new transactions since the last sync, through the same Gemma normalization schema.
- Real bank API integration (Plaid-style aggregation) is noted as future work, not built live for the hackathon.

All ingestion paths — CSV/Excel/PDF, photographed documents, voice notes, synced feed — converge on the same uniform schema before reaching PostgreSQL.

---

## 9. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, Tailwind CSS, Recharts, ship visualization (SVG/Canvas, 2D stylized) |
| Backend | FastAPI (Python) |
| Structured Database | PostgreSQL / Supabase |
| Vector Database | pgvector or Pinecone |
| Analytics & Simulation | Pandas, NumPy, Scikit-learn, Prophet, NumPy-vectorized Monte Carlo engine |
| AI / Language Layer | Gemma (12B recommended — native audio, image, text; function calling; long context) via Google AI Studio |
| Deployment | Vercel (frontend) + Railway / Render (backend) |

---

## 10. Demo Flow

1. Owner uploads a bank statement (CSV/Excel/PDF), photographs a paper invoice, or logs a transaction by voice note.
2. Data Onboarding Agent parses, normalizes, dedupes, and categorizes — regardless of input modality.
3. Analytics Agent computes cash flow, reliability scores, anomalies, and runs Monte Carlo simulation on top of the Prophet baseline.
4. **Ship view renders:** water level reflects current balance, wave turbulence reflects forecast confidence, storm clouds signal predicted risk.
5. Owner taps an element on the ship (e.g., an iceberg) → dashboard opens to the exact underlying metric.
6. Owner asks a question via voice or text ("Can I afford new equipment?") → Course of Action Agent answers using Analytics Agent numbers + RAG-retrieved document context where relevant.
7. Owner asks a document-specific question ("Does my loan allow early repayment?") → Document Intelligence Agent retrieves the relevant clause and Gemma explains it, citing the source.
8. System generates a prioritized weekly action plan and drafts an invoice follow-up for the highest-risk outstanding invoice, in the owner's preferred language.

---

## 11. Expected Impact

For SMEs who typically lack a dedicated finance team, THESEUS compresses the work of a financial analyst into an automated, always-on assistant: it does not just report what happened, it forecasts what is likely to happen, quantifies how confident that forecast is, grounds every legal or tax claim in the actual source document, and tells the owner exactly what to do next — all while making the state of the business instantly legible at a glance. This shifts SME financial management from reactive bookkeeping to proactive risk management.

*Prepared for Track 1: Gemma SME Cashflow Copilot*
