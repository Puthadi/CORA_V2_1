# 💡 Solution Design

## CORA — AI Agent for Cost Center Error Resolution

---

## 1. Solution Overview

CORA is a **conversational AI agent** built on **SAP Business Technology Platform (BTP)** that:

1. **Detects** cost center errors from SAP S/4HANA in real time
2. **Analyzes** root causes using live SAP data + Claude AI
3. **Recommends** prioritized corrective actions with confidence scores
4. **Executes** resolution actions directly from the chat interface
5. **Learns** from outcomes to improve over time

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│                    CORA Solution Architecture                            │
│                                                                          │
├──────────────┬───────────────────────────────────────────────────────────┤
│              │                                                           │
│  Finance     │              SAP Business Technology Platform             │
│  User        │  ┌─────────────────────────────────────────────────────┐ │
│              │  │                                                     │ │
│  ┌────────┐  │  │  ┌──────────────┐      ┌────────────────────────┐  │ │
│  │Fiori   │──┼──┼─▶│  App Router  │─────▶│   CAP Node.js          │  │ │
│  │UI5     │  │  │  │  (XSUAA)     │      │   Backend              │  │ │
│  │Chat    │◀─┼──┼──│              │◀─────│                        │  │ │
│  │App     │  │  │  └──────────────┘      │  AgentService          │  │ │
│  └────────┘  │  │                        │  ErrorService          │  │ │
│              │  │                        └──────────┬─────────────┘  │ │
│              │  │                                   │                 │ │
│              │  │           ┌───────────────────────┼──────────────┐ │ │
│              │  │           │      AI Engine Layer  │              │ │ │
│              │  │           │                       ▼              │ │ │
│              │  │           │  ┌────────────┐  ┌──────────────┐   │ │ │
│              │  │           │  │ Root Cause │  │Recommendation│   │ │ │
│              │  │           │  │ Engine     │  │Engine        │   │ │ │
│              │  │           │  │ (2-pass)   │  │              │   │ │ │
│              │  │           │  └─────┬──────┘  └──────────────┘   │ │ │
│              │  │           │        │                              │ │ │
│              │  │           │  ┌─────▼──────────────────────────┐  │ │ │
│              │  │           │  │       SAP AI Core              │  │ │ │
│              │  │           │  │   Claude (Anthropic) Model     │  │ │ │
│              │  │           │  │   + 8 SAP Tool Definitions     │  │ │ │
│              │  │           │  └─────┬──────────────────────────┘  │ │ │
│              │  │           │        │ tool_use calls               │ │ │
│              │  │           │  ┌─────▼──────────────────────────┐  │ │ │
│              │  │           │  │      SAP Connector             │  │ │ │
│              │  │           │  │  @sap-cloud-sdk/http-client    │  │ │ │
│              │  │           │  └─────┬──────────────────────────┘  │ │ │
│              │  │           └────────│─────────────────────────────┘ │ │
│              │  │                    │ BTP Destination                │ │
│              │  │  ┌─────────────────▼──────────────────────────────┐ │ │
│              │  │  │  BTP Connectivity + Cloud Connector            │ │ │
│              │  └──┴────────────────────────────────────────────────┘ │ │
│              │                       │ HTTPS tunnel                    │
│              │  ┌────────────────────▼───────────────────────────────┐ │
│              │  │          SAP S/4HANA (Private Cloud)               │ │
│              │  │  OData APIs: Cost Center, Journal, Workflow, Logs  │ │
│              │  └────────────────────────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────────────────────┘
```

---

## 3. Core Solution Components

### 3.1 Two-Pass Root Cause Engine

The root cause engine runs in two phases to balance speed with accuracy:

```
Error Input
    │
    ▼
┌───────────────────────────────────────┐
│         PASS 1: Rule Engine           │  < 100ms
│                                       │
│  • Match errorCode against            │
│    knowledge base (20+ patterns)      │
│  • Classify layer from message class  │
│  • Check for high-priority keywords   │
│                                       │
│  If confidence ≥ 90%:                 │
│  → Return rule-based result           │
└────────────────┬──────────────────────┘
                 │ confidence < 90% or unknown error
                 ▼
┌───────────────────────────────────────┐
│         PASS 2: AI Engine             │  3–8 seconds
│                                       │
│  Claude (via SAP AI Core) with        │
│  access to 8 SAP data tools:          │
│                                       │
│  1. get_cost_center_details           │
│  2. get_posting_period_status         │
│  3. get_error_message_text            │
│  4. get_application_log_details       │
│  5. get_journal_entry                 │
│  6. search_error_patterns             │
│  7. get_budget_status                 │
│  8. get_activity_type_assignment      │
│                                       │
│  → Returns: layer, rootCauseText,     │
│    recommendations[]                  │
└───────────────────────────────────────┘
```

### 3.2 Agentic Tool Use Loop

When Claude needs live SAP data, it calls tools mid-reasoning:

```
Claude: "I need to check if CC1000 is actually blocked..."

  ── tool_use ──▶  get_cost_center_details({
                     costCenter: "CC1000",
                     controllingArea: "A000"
                   })

  ◀── tool_result ── {
    IsBlockedForPrimCosts: "X",
    ValidityEndDate: "9999-12-31",
    ProfitCenter: "PC-EMEA",
    ResponsiblePersonName: "Sarah Chen"
  }

Claude: "Confirmed — CC1000 has IsBlockedForPrimCosts = 'X'.
         This was set during period-end close. The responsible
         person Sarah Chen can request an unlock via workflow..."
```

### 3.3 Recommendation Scoring

```
Recommendation Score = PriorityScore + ConfidenceScore

PriorityScore:  HIGH=300, MEDIUM=200, LOW=100
ConfidenceScore: 0–100 (AI-assigned)

Top 3 recommendations displayed, ranked by score.
Recommendations with confidence < 70% flagged: "Manual review recommended"
```

### 3.4 Fiori Chat Interface

```
Layout: Two-panel responsive design
- Left 30%:  Error list sidebar (filterable by layer/status)
- Right 70%: Chat area + recommendations + action buttons

Key interactions:
1. Select error from sidebar → auto-triggers AI analysis
2. Chat with CORA → context-aware responses
3. Click "Execute" on recommendation → action framework runs
4. Thumbs up/down → feedback stored for model improvement
5. Suggestion chips → one-tap common queries
```

---

## 4. Solution Differentiators

| Feature | Traditional Approach | CORA |
|---------|---------------------|------|
| Error understanding | Copy-paste error code into browser | Instant AI explanation in business language |
| Root cause analysis | 5–10 SAP transactions manually | Automated with live SAP data in < 8s |
| Resolution guidance | Dependent on CO expert availability | Always-on AI recommendations |
| Action execution | Navigate to multiple Fiori apps | One-click from chat interface |
| Knowledge retention | Individual memory / tribal knowledge | Persistent knowledge base + learning |
| Self-service | Not possible for most users | Full self-service for 70%+ of errors |

---

## 5. Technology Choices

### Why SAP CAP Node.js?
- Native SAP BTP integration (HANA, XSUAA, Destination)
- OData V4 auto-generated from CDS model
- Lightweight for AI workloads
- Large npm ecosystem for HTTP clients

### Why SAP AI Core + Claude?
- **SAP AI Core**: Enterprise-grade AI governance, data residency, BTP integration, usage metering
- **Claude (Anthropic)**: Superior reasoning for complex multi-step analysis, reliable JSON output, excellent tool use handling
- **Together**: Best-in-class AI within SAP's trust boundary

### Why SAP Fiori/UI5?
- Consistent with SAP Launchpad (no new portal to learn)
- Horizon theme fits enterprise look & feel
- Can be embedded directly into SAP Build Work Zone
- Responsive (works on tablet for warehouse/plant scenarios)

### Why BTP Destination + Cloud Connector?
- Secure tunnel to on-premise S/4HANA without VPN
- Centralized credential management in BTP Cockpit
- No need to expose S/4HANA directly to internet
- Standard SAP enterprise connectivity pattern

---

## 6. Data Flow — Error Resolution Lifecycle

```
1. ERROR DETECTION
   S/4HANA application log / failed posting
          │
          ▼
2. INGESTION (POST /error/ingest)
   errorCode, messageClass, costCenter, documentNumber
          │
          ▼
3. CLASSIFICATION (knowledge-base.js)
   Layer: MASTER_DATA | TRANSACTION | CONFIG | AUTHORIZATION
          │
          ▼
4. USER TRIGGERS ANALYSIS (chat message)
          │
          ▼
5. PASS 1: RULE ENGINE (< 100ms)
   Match against 20+ known patterns
          │
          ▼ (if not matched with high confidence)
6. PASS 2: CLAUDE AI ENGINE (3–8s)
   Calls SAP tools → fetches live data → reasons → generates response
          │
          ▼
7. RECOMMENDATIONS GENERATED
   Ranked by priority + confidence, stored in DB
          │
          ▼
8. USER SELECTS ACTION
   RETRY | WORKFLOW | UPDATE_CC | LAUNCH_FIORI | ESCALATE
          │
          ▼
9. ACTION FRAMEWORK EXECUTES
   Calls S/4HANA OData API → records result in Actions table
          │
          ▼
10. ERROR STATUS UPDATED
    OPEN → IN_PROGRESS → RESOLVED
          │
          ▼
11. FEEDBACK COLLECTED
    👍/👎 stored → improves future recommendations
```

---

## 7. Security Design

### Authentication & Authorization
```
Browser Request
    │
    ▼
App Router (checks XSUAA JWT token)
    │
    ▼
CAP Backend (verifies scopes from JWT)
    │  CostCenterAccountant scope required for /agent/chat
    │  CostCenterManager scope required for /agent/executeAction
    ▼
HANA Cloud (row-level security via CDS @restrict annotations)
```

### Data Security
- All S/4HANA credentials stored in BTP Destination Service (never in code)
- AI Core service key stored in BTP environment variables (never committed to git)
- No PII or financial amounts stored beyond what is required for error context
- Audit trail immutable — Actions table insert-only after creation

---

## 8. Scalability Design

| Concern | Solution |
|---------|---------|
| High error volumes | Batch ingest with deduplication check |
| Concurrent AI requests | SAP AI Core handles quota management |
| Multi-company | Controlled by companyCode filter in all queries |
| Multi-controlling area | controllingArea parameter on all cost center tools |
| Token expiry | Auto-refresh with 60-second buffer in ai-engine.js |
| Tool loop limits | maxIterations cap prevents infinite tool loops |

---

## 9. Deployment Model

```
SAP BTP Cloud Foundry Space
├── cc-error-agent-approuter    (HTML5 App Router, 256MB)
├── cc-error-agent-srv          (CAP Node.js, 512MB)
└── cc-error-agent-db-deployer  (HANA HDI deployer, runs once)

BTP Services:
├── hana (HDI container)        → persistent data
├── xsuaa (application plan)    → authentication
├── destination (lite)          → S/4HANA routing
├── connectivity (lite)         → Cloud Connector tunnel
├── html5-apps-repo (runtime)   → static Fiori app hosting
└── aicore (extended plan)      → Claude model inference
```

---

## 10. Expected Outcomes

| Business Metric | Baseline | With CORA | Improvement |
|----------------|---------|-----------|-------------|
| Avg. error resolution time | 3.5 hours | 20 minutes | **-90%** |
| CO team support load | ~400 tickets/month | ~140 tickets/month | **-65%** |
| Repeat error rate | 45% | 20% | **-25pp** |
| Month-end close duration | +2.5 days for errors | +0.8 days | **-68%** |
| User satisfaction (CSAT) | 2.8/5 | 4.3/5 | **+54%** |
| Annual operational cost | €420K | €180K | **-€240K** |
